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
} from "vertex-framework";
import { User } from "./User";
// import { config } from "../app/config";


/**
 * neolace is designed to support multi-tenant use cases (so lots of small sites can share a single large installation).
 * 
 * This "Site" model defines each site, which has its own schema and set of entries, etc.
 * 
 * Users are shared among all sites on a given installation.
 */
@VNodeType.declare
export class Site extends VNodeType {
    static label = "Site";
    static readonly properties = {
        ...VNodeType.properties,
        // The shortID of this site (string up to 32 characters long). Use "site-default" if there is only one site.
        // Many API requests will require that the site shortId be provided, unless the default site is meant.
        shortId: ShortIdProperty,
        // The canonical domain for this site?
        // domain: Joi.string().required(),
        description: Joi.string().max(5_000).required(),
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



/** Update a "Site" */
interface UpdateSiteArgs {
    shortId?: string;
    description?: string;
}
// Action to make changes to an existing Site:
export const UpdateSite = defaultUpdateActionFor(Site, s => s.shortId.description, {});

/** Create a new "Site" */
export const CreateSite = defaultCreateFor(Site, s => s.shortId.description, UpdateSite);

export const [DeleteSite, UnDeleteSite] = defaultDeleteAndUnDeleteFor(Site);
