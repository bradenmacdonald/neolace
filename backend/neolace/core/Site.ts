import { FrontendConfigData, FrontendConfigSchema } from "neolace/deps/neolace-api.ts";
import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    VNodeType,
    VirtualPropType,
    defaultUpdateFor,
    defaultDeleteFor,
    Field,
    defineAction,
    VNID,
    VNodeTypeRef,
    DerivedProperty,
    RawVNode,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";
import { makeCachedLookup } from "neolace/lib/lru-cache.ts";
import { graph } from "neolace/core/graph.ts";


// Forward reference
export const SiteRef: typeof Site = VNodeTypeRef();

import { CreateGroup, GroupMaxDepth, Group } from "./Group.ts";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Constants for "site codes" - See arch-decisions/007-sites-multitenancy for details.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Regex for validating a "site code"
const siteCodeRegex = /^[0-9A-Za-y][0-9A-Za-z]{4}$/;
// Characters allowed in the site code, in ASCII sort order:
const siteCodeChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// There are 5 characters in each site code:
const siteCodeLength = 5;
// This is the total number of possible site codes: 901,356,496
// The first character cannot start with "z"; this is reserved for future expansion.
const siteCodesMaxCount = (siteCodeChars.length - 1) * Math.pow(siteCodeChars.length, siteCodeLength - 1);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site model
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export enum AccessMode {
    /** on a private site, access to entries is restricted to invited users */
    Private = "private",
    /** Public (contributions): anyone can read all entries and propose edits (default) */
    PublicContributions = "pubcont",
    /** Public (read only): anyone can read all entries but only those with permission can propose edits */
    PublicReadOnly = "readonly", 
}

/**
 * Neolace is designed to support multi-tenant use cases (so lots of small sites can share a single large installation).
 * 
 * This "Site" model defines each site, which has its own schema and set of entries, etc.
 * 
 * See arch-decisions/007-sites-multitenancy for details.
 * 
 * Users are shared among all sites on a given installation.
 */
export class Site extends VNodeType {
    static readonly label = "Site";
    static readonly slugIdPrefix = "site-";
    static readonly properties = {
        ...VNodeType.properties,
        /**
         * Name: the name of this site (always public)
         */
        name: Field.String.Check(check.string.min(2).max(120)),
        /**
         * The slugId of this site. Must begin with "site-".
         * In API URLs, the site's slugId is included without the "site-" prefix:
         *     https://api.neolace.com/site/braden/entry/fr-joel
         *                                  ^^^^^^- indicated slugId is "site-braden"
         */
        slugId: Field.Slug,
        /** 
         * The "site code" which gives this site's slugIds a unique namespace. Example: "00001" or "Yb3FF"
         * See arch-decisions/007-sites-multitenancy for details.
         * 
         * This is an internal detail and is never exposed via the API. It should also never change.
         */
        siteCode: Field.String.Check(check.string.regexp(siteCodeRegex)),
        /**
         * The canonical domain for this site, e.g. "mysite.neolace.com".
         *
         * It is important to verify that the user actually controls this domain before setting it here.
         * 
         * This value must be unique among all sites.
         */
        domain: Field.String,
        /**
         * Description: a public description of the website, displayed to users in a few different places as well as to
         * search engines.
         */
        description: Field.NullOr.String.Check(check.string.max(5_000)),
        /**
         * Markdown text for the home page. This defines the content of the home page.
         */
        homePageMD: Field.NullOr.String.Check(check.string.max(100_000)),
        /**
         * Markdown text for the footer, shown on all pages.
         */
        footerMD: Field.String.Check(check.string.max(10_000)),

        // Access Mode: Determines what parts of the site are usable without logging in
        accessMode: Field.String.Check(check.Schema.enum(AccessMode)),

        /**
         * Configuration related to the frontend, such as:
         *   - theme/colors (future)
         *   - links shown in the header
         *   - analytics integrations to use
         *   - redirects
         * 
         * This is a JSON object with the format:
         * {
         *     "links": [{"text": "Home", "href": "/"}, {"text": "About", "href": "/about"}, ...],
         *     "integrations": {
         *         "plausible-analytics": {...},
         *         ...
         *     },
         *     "redirects": {
         *         "/team": "/entry/team",
         *         ...
         *     }
         * }
         */
        frontendConfigJSON: Field.String.Check(check.string.max(10_000)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        // HAS_USER_ROLE: {
        //     to: [User],
        //     properties: {role: Joi.string().allow("admin", "editor", "contributor", "viewer").required()},
        //     cardinality: VNodeType.Rel.ToManyUnique,
        // },
        // HAS_ENTRIES: {
        //     to: [Entry],
        //     cardinality: VNodeType.Rel.ToMany,
        // },
    });
    static readonly virtualProperties = this.hasVirtualProperties(() => ({
        groupsFlat: {
            // A flattened list of all the user groups that this site has
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Group})-[:${Group.rel.BELONGS_TO}*1..${C(String(GroupMaxDepth))}]->(@this)`,
            target: Group,
        },
    }));
    static readonly derivedProperties = this.hasDerivedProperties({
        shortId,
        frontendConfig,
    });

    static async validate(dbObject: RawVNode<typeof this>): Promise<void> {
        // Validate the frontendConfigJSON field:
        let frontendConfigJSON;
        try {
            frontendConfigJSON = JSON.parse(dbObject.frontendConfigJSON);
        } catch (_err: unknown) { throw new ValidationError(`frontendConfigJSON is not valid JSON.`); }
        FrontendConfigSchema(frontendConfigJSON);
    }
}

VNodeTypeRef.resolve(SiteRef, Site);


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site helper functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/** Cache to look up a siteId (Site VNID) from a site's shortId (slugId without the "site-" prefix) */
export const siteIdFromShortId = makeCachedLookup((shortId: string) => graph.vnidForKey(`site-${shortId}`), 10_000);

/**
 * A derived property that provides the shortId of a Site.
 * 
 * Note: Sites have "shortId", without the "site-" prefix. This is different from the siteCode.
 * whereas Entries have "friendlyId", without the siteCode prefix, which varies.
 */
export function shortId(): DerivedProperty<string> { return DerivedProperty.make(
    Site,
    s => s.slugId,
    s => s.slugId.substr(5),  // Remove the "site-" prefix
);}

/**
 * A derived property that provides the "frontend config", parsed from JSON
 */
export function frontendConfig(): DerivedProperty<FrontendConfigData> { return DerivedProperty.make(
    Site,
    s => s.frontendConfigJSON,
    s => JSON.parse(s.frontendConfigJSON),
);}

/** Cache to look up a Site's siteCode from its VNID */
export const siteCodeForSite = makeCachedLookup((siteId: VNID) => graph.pullOne(Site, s => s.siteCode, {key: siteId}).then(s => s.siteCode), 10_000);

/** Convert an entry's slugId (with siteCode prefix) into a "friendlyId" */
export function slugIdToFriendlyId(slugId: string): string {
    return slugId.substr(5);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site actions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Action to make changes to an existing Site:
export const UpdateSite = defaultUpdateFor(Site, s => s.slugId.description.homePageMD.footerMD.domain.accessMode, {
    otherUpdates: async (args: {frontendConfig?: FrontendConfigData}, tx, nodeSnapshot) => {
        if (args.frontendConfig) {
            await tx.queryOne(C`
                MATCH (site:${Site} {id: ${nodeSnapshot.id}})
                SET site.frontendConfigJSON = ${JSON.stringify(args.frontendConfig)}
            `.RETURN({}));
        }
        return {};
    },
});

export const DeleteSite = defaultDeleteFor(Site);


export const CreateSite = defineAction({
    type: "CreateSite",
    parameters: {} as {
        id?: VNID;
        name: string;
        slugId: string;
        domain: string;
        description?: string;
        homePageMD?: string;
        footerMD?: string;
        siteCode?: string;
        adminUser?: VNID;
        accessMode?: AccessMode;
        frontendConfig?: FrontendConfigData;
    },
    resultData: {} as {
        id: VNID;
        siteCode: string;
        adminGroup?: VNID;
    },
    apply: async (tx, data) => {
        // Generate a VNID and "site code":
        const id = data.id ?? VNID();
        let siteCode: string;
        if (data.siteCode) {
            siteCode = data.siteCode;
        } else {
            // Generate an unused site code:
            const siteCodeIsTaken = async (): Promise<boolean> => (await tx.pull(Site, s => s.id, {where: C`@this.siteCode = ${siteCode}`})).length > 0;
            do {
                siteCode = siteCodeFromNumber(Math.floor(Math.random() * siteCodesMaxCount));
            } while (await siteCodeIsTaken());
        }
        const resultData: { id: VNID; siteCode: string; adminGroup?: VNID; } = {
            id,
            siteCode,
        };
        const modifiedNodes: VNID[] = [id];

        // Create the Site:
        await tx.queryOne(C`
            CREATE (s:${Site} {
                id: ${id},
                name: ${data.name},
                slugId: ${data.slugId},
                siteCode: ${siteCode},
                description: ${data.description || null},
                homePageMD: ${data.homePageMD || null},
                footerMD: ${data.footerMD || ""},
                domain: ${data.domain},
                accessMode: ${data.accessMode ?? AccessMode.PublicContributions},
                frontendConfigJSON: ${JSON.stringify(data.frontendConfig ?? {})}
            })
        `.RETURN({}));

        // Create an administrators group and add the specified user as an admin
        if (data.adminUser) {
            const newGroupResult = await CreateGroup.apply(tx, {
                name: "Administrators",
                belongsTo: id,
                administerSite: true,
                administerGroups: true,
                approveEntryEdits: true,
                approveSchemaChanges: true,
                proposeEntryEdits: true,
                proposeSchemaChanges: true,
                addUsers: [data.adminUser],
            });
            resultData.adminGroup = newGroupResult.resultData.id;
            modifiedNodes.push(resultData.adminGroup);
        }

        return {
            resultData,
            modifiedNodes,
            description: `Created ${Site.withId(id)}`,
        };
    },
});




function siteCodeFromNumber(i: number): string {
    if (i < 0 || i >= siteCodesMaxCount || isNaN(i)) {
        throw new Error(`${i} is out of range for a site code.`);
    }
    let siteCode = "";
    for (let pos = 0; pos < siteCodeLength; pos ++) {
        const value = i % (siteCodeChars.length)
        siteCode = siteCodeChars[value] + siteCode;
        i = (i - value) / siteCodeChars.length;
    }
    if (i !== 0) {
        throw new Error(`Unexpectedly had i=${i} left in siteCodeFromNumber`);
    }
    return siteCode;
}

// Things that are internal but available to the test suite:
export const testExports = {
    siteCodeFromNumber,
    siteCodesMaxCount,
};
