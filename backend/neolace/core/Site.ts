import { FrontendConfigData, FrontendConfigSchema, SiteAccessMode } from "neolace/deps/neolace-sdk.ts";
import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    defaultDeleteFor,
    defaultUpdateFor,
    defineAction,
    DerivedProperty,
    Field,
    RawVNode,
    VirtualPropType,
    VNID,
    VNodeType,
    VNodeTypeRef,
} from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { makeCachedLookup } from "neolace/lib/lru-cache.ts";
import { getGraph } from "neolace/core/graph.ts";

// Forward reference
export const SiteRef: typeof Site = VNodeTypeRef();

import { CreateGroup, Group, GroupMaxDepth } from "./permissions/Group.ts";

export { SiteAccessMode as AccessMode };

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site model
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
    static readonly properties = {
        ...VNodeType.properties,
        /**
         * Name: the name of this site (always public)
         */
        name: Field.String.Check(check.string.min(2).max(120)),
        /**
         * The short (slug) string Identifier for this site.
         */
        key: Field.Slug,
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
        description: Field.String.Check(check.string.max(5_000)),
        /**
         * Markdown text for the home page. This defines the content of the home page.
         */
        homePageContent: Field.String.Check(check.string.max(100_000)),
        /**
         * Markdown text for the footer, shown on all pages.
         */
        footerContent: Field.String.Check(check.string.max(10_000)),

        /** Access Mode: Determines what parts of the site are usable without logging in */
        accessMode: Field.String.Check(check.Schema.enum(SiteAccessMode)),

        /** Additional permissions that apply to everyone, including users who aren't logged in */
        publicGrantStrings: Field.NullOr.List(Field.String),

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
        frontendConfig: Field.JsonObjString,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        // There are no relationships _from_ each Site - only _to_ each Site node.
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
        url,
    });

    static async validate(dbObject: RawVNode<typeof this>): Promise<void> {
        // Validate the frontendConfig field:
        FrontendConfigSchema(dbObject.frontendConfig);
    }
}

VNodeTypeRef.resolve(SiteRef, Site);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site helper functions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/** Cache to look up a siteId (Site VNID) from a site's key */
export const siteIdFromKey = makeCachedLookup(
    async (key: string) => (await getGraph()).pullOne(Site, (s) => s.id, { with: { key } }).then((s) => s.id),
    10_000,
);

/** Cache to look up a site's key from its VNID */
export const siteKeyFromId = makeCachedLookup(
    async (siteId: VNID) => (await getGraph()).pullOne(Site, (s) => s.key, { key: siteId }).then((s) => s.key),
    10_000,
);

/**
 * A derived property that provides the full URL of a Site.
 */
export function url(): DerivedProperty<string> {
    return DerivedProperty.make(
        Site,
        (s) => s.domain,
        (s) => `${config.siteUrlPrefix}${s.domain}${config.siteUrlSuffix}`,
    );
}

interface HomeSiteData {
    siteId: VNID;
    key: string;
    name: string;
    domain: string;
    url: string;
}
/** Internal cache that makes getHomeSite() instant in most cases. */
let mainSiteCache: Readonly<HomeSiteData>;

/**
 * Get basic information about the "home site" of this Neolace realm.
 * The home site is where users log in, manage their profiles, and create/edit/delete other sites.
 */
export async function getHomeSite(): Promise<Readonly<HomeSiteData>> {
    if (mainSiteCache === undefined) {
        const key = config.realmHomeSiteId;
        const graph = await getGraph();
        let data;
        try {
            data = await graph.pullOne(Site, (s) => s.id.name.domain.url(), { with: { key } });
        } catch (err) {
            throw new Error(
                "Unable to load the home site. Check the realmHomeSiteId setting. In development, you may need to " +
                    'run the "Erase Database and create default sites" task.',
                { cause: err },
            );
        }
        mainSiteCache = Object.freeze({
            siteId: data.id,
            key,
            name: data.name,
            domain: data.domain,
            url: data.url,
        });
    }
    return mainSiteCache;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Site actions
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Action to make changes to an existing Site:
export const UpdateSite = defaultUpdateFor(
    Site,
    (s) => s.key.name.description.homePageContent.footerContent.domain.accessMode.publicGrantStrings,
    {
        otherUpdates: async (args: { frontendConfig?: FrontendConfigData }, tx, nodeSnapshot) => {
            if (args.frontendConfig) {
                await tx.queryOne(C`
                MATCH (site:${Site} {id: ${nodeSnapshot.id}})
                SET site.frontendConfig = ${JSON.stringify(args.frontendConfig)}
            `.RETURN({}));
            }
            return {};
        },
    },
);

export const DeleteSite = defaultDeleteFor(Site);

export const CreateSite = defineAction({
    type: "CreateSite",
    parameters: {} as {
        id?: VNID;
        name: string;
        key: string;
        domain: string;
        description?: string;
        homePageContent?: string;
        footerContent?: string;
        adminUser?: VNID;
        accessMode?: SiteAccessMode;
        frontendConfig?: FrontendConfigData;
        publicGrantStrings?: string[];
    },
    resultData: {} as {
        id: VNID;
        adminGroup?: VNID;
    },
    apply: async (tx, data) => {
        // Generate a VNID:
        const id = data.id ?? VNID();
        const resultData: { id: VNID; adminGroup?: VNID } = { id };
        const modifiedNodes: VNID[] = [id];

        // Create the Site:
        await tx.queryOne(C`
            CREATE (s:${Site} {
                id: ${id},
                name: ${data.name},
                key: ${data.key},
                description: ${data.description || ""},
                homePageContent: ${data.homePageContent || ""},
                footerContent: ${data.footerContent || ""},
                domain: ${data.domain},
                accessMode: ${data.accessMode ?? SiteAccessMode.PublicContributions},
                frontendConfig: ${JSON.stringify(data.frontendConfig ?? {})},
                publicGrantStrings: ${data.publicGrantStrings ?? []}
            })
        `.RETURN({}));

        // Create an administrators group and add the specified user as an admin
        if (data.adminUser) {
            const newGroupResult = await CreateGroup.apply(tx, {
                name: "Administrators",
                belongsTo: id,
                grantStrings: ["*"],
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
