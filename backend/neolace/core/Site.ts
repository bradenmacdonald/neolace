import Joi from "@hapi/joi";
import {
    C,
    VNodeType,
    VirtualPropType,
    defaultUpdateActionFor,
    defaultCreateFor,
    defaultDeleteAndUnDeleteFor,
    ShortIdProperty,
    DerivedProperty,
    defineAction,
    UUID,
} from "vertex-framework";
import { log } from "../app/log";
import { graph } from "./graph";


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Constants for "site codes" - See arch-decisions/007-sites-multitenancy for details.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Regex for validating a "site code"
const siteCodeRegex = /^[0-9A-Za-y][0-9A-Za-z]{3}$/;
// Characters allowed in the site code, in ASCII sort order:
const siteCodeChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// There are 4 characters in each site code:
const siteCodeLength = 4;
// This is the total number of possible site codes: 14,538,008
// The first character cannot start with "z"; this is reserved for future expansion.
const siteCodesMaxCount = (siteCodeChars.length - 1) * Math.pow(siteCodeChars.length, siteCodeLength - 1);


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
@VNodeType.declare
export class Site extends VNodeType {
    static readonly label = "Site";
    static readonly shortIdPrefix = "site-";
    static readonly properties = {
        ...VNodeType.properties,
        /**
         * The shortID of this site (string up to 32 characters long). Must begin with "site-".
         * In API URLs, the site's shortId is included without the "site-" prefix:
         *     https://api.neolace.com/site/braden/entry/fr-joel
         *                                  ^^^^^^- indicated shortId is "site-braden"
         */
        shortId: ShortIdProperty,
        /** 
         * The "site code" which gives this site's shortIds a unique namespace. Example: "0001" or "Yb3F"
         * See arch-decisions/007-sites-multitenancy for details.
         * 
         * This is an internal detail and is never exposed via the API. It should also never change.
         */
        siteCode: Joi.string().regex(siteCodeRegex).required(),
        /**
         * The canonical domain for this site, e.g. "mysite.neolace.com".
         *
         * Note that this is not forced to be unique!! We don't want to allow users to "block" a domain that they don't
         * own, e.g. by registering a site on Neolace.com and changing the domain to "microsoft.com"
         */
        domain: Joi.string().max(1_000).required(),
        description: Joi.string().max(5_000),
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
        // users: {
        //     type: VirtualPropType.ManyRelationship,
        //     query: C`(@this)-[:${Site.rel.HAS_USER_ROLE}]->(@target:${User})`,
        //     target: User,
        // },
    });
    static readonly derivedProperties = VNodeType.hasDerivedProperties({
        // None at the moment.
    });
}

// Action to make changes to an existing Site:
export const UpdateSite = defaultUpdateActionFor(Site, s => s.shortId.description.domain, {});

export const [DeleteSite, UnDeleteSite] = defaultDeleteAndUnDeleteFor(Site);


export const CreateSite = defineAction({
    type: "CreateSite",
    parameters: {} as {
        shortId: string;
        domain: string;
        description?: string;
        siteCode?: string;
    },
    resultData: {} as {
        uuid: UUID;
        siteCode: string;
    },
    apply: async (tx, data) => {
        const uuid = UUID();
        let siteCode: string;
        if (data.siteCode) {
            siteCode = data.siteCode;
        } else {
            // Generate an unused site code:
            const siteCodeIsTaken = async (): Promise<boolean> => (await tx.pull(Site, s => s.uuid, {where: C`@this.siteCode = ${siteCode}`})).length > 0;
            do {
                siteCode = siteCodeFromNumber(Math.floor(Math.random() * siteCodesMaxCount));
            } while (await siteCodeIsTaken());
        }

        await tx.queryOne(C`
            CREATE (s:${Site} {
                uuid: ${uuid},
                shortId: ${data.shortId},
                siteCode: ${siteCode},
                description: ${data.description || null},
                domain: ${data.domain}
            })
        `.RETURN({}));
        return {
            resultData: { uuid, siteCode, },
            modifiedNodes: [uuid],
        };
    },
    invert: (data, resultData) => DeleteSite({key: resultData.uuid}),
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