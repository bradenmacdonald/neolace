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
} from "vertex-framework";


// Forward reference
export const SiteRef: typeof Site = VNodeTypeRef("Site");

import { CreateGroup, GroupRef as Group } from "./Group";


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
@VNodeType.declare
export class Site extends VNodeType {
    static readonly label = "Site";
    static readonly slugIdPrefix = "site-";
    static readonly properties = {
        ...VNodeType.properties,
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
        siteCode: Field.String.Check(sc => sc.regex(siteCodeRegex)),
        /**
         * The canonical domain for this site, e.g. "mysite.neolace.com".
         *
         * Note that this is not forced to be unique!! We don't want to allow users to "block" a domain that they don't
         * own, e.g. by registering a site on Neolace.com and changing the domain to "microsoft.com"
         */
        domain: Field.String,
        description: Field.NullOr.String.Check(desc => desc.max(5_000)),

        // Access Mode: Determines what parts of the site are usable without logging in
        accessMode: Field.String.Check(am => am.valid(...Object.values(AccessMode))),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
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
    static readonly virtualProperties = VNodeType.hasVirtualProperties({
        groupsFlat: {
            // A flattened list of all the user groups that this site has
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Group})-[:${Group.rel.BELONGS_TO}*1..${C(String(Group.maxDepth))}]->(@this)`,
            target: Group,
        },
    });
    static readonly derivedProperties = VNodeType.hasDerivedProperties({
        // None at the moment.
    });
}

// Action to make changes to an existing Site:
export const UpdateSite = defaultUpdateFor(Site, s => s.slugId.description.domain.accessMode, {});

export const DeleteSite = defaultDeleteFor(Site);


export const CreateSite = defineAction({
    type: "CreateSite",
    parameters: {} as {
        slugId: string;
        domain: string;
        description?: string;
        siteCode?: string;
        adminUser?: VNID;
        accessMode?: AccessMode;
    },
    resultData: {} as {
        id: VNID;
        siteCode: string;
        adminGroup?: VNID;
    },
    apply: async (tx, data) => {
        // Generate a VNID and "site code":
        const id = VNID();
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
        const resultData: any = {id, siteCode};
        const modifiedNodes: VNID[] = [id];

        // Create the Site:
        await tx.queryOne(C`
            CREATE (s:${Site} {
                id: ${id},
                slugId: ${data.slugId},
                siteCode: ${siteCode},
                description: ${data.description || null},
                domain: ${data.domain},
                accessMode: ${data.accessMode ?? AccessMode.PublicContributions}
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