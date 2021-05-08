import * as Joi from "@hapi/joi";

import {
    VNodeType,
    defaultUpdateActionFor,
    defaultDeleteAndUnDeleteFor,
    defaultCreateFor,
    C,
    ValidationError,
    VNodeTypeRef,
    VirtualPropType,
    RawVNode,
    WrappedTransaction,
    VNodeKey,
    VNID,
} from "vertex-framework";

// Forward reference
export const GroupRef: typeof Group = VNodeTypeRef("Group");
import { SiteRef as Site } from "./Site";
import { User } from "./User";


export const enum Permissions {
    administerSite = "administerSite",
    administerGroups = "administerGroups",
    approveSchemaChanges = "approveSchemaChanges",
    approveEntryChanges = "approveEntryChanges",
    proposeSchemaChanges = "proposeSchemaChanges",
    proposeEntryChanges = "proposeEntryChanges",
}


@VNodeType.declare
export class Group extends VNodeType {
    static readonly label = "Group";
    static readonly properties = {
        ...VNodeType.properties,
        // Name of this group
        name: Joi.string().max(200),
        // Admin-level permissions:
        [Permissions.administerSite]: Joi.boolean().required(),  // Can set properties of the site like domain name, name, private/public, etc.
        [Permissions.administerGroups]: Joi.boolean().required(),  // Can administer users and groups on this site:
        [Permissions.approveSchemaChanges]: Joi.boolean().required(),  // Can approve change requests related to the site schema
        [Permissions.approveEntryChanges]: Joi.boolean().required(),  // Can approve change requests related to the site content
        // Normal user level permissions:
        [Permissions.proposeSchemaChanges]: Joi.boolean().required(),
        [Permissions.proposeEntryChanges]: Joi.boolean().required(),
        // future permission: participate in discussions

        // Membership in _any_ group grants permission to view entries and schema on the site
    };
    // How many levels of groups a site can have (groups can be nested, e.g. Employees > Managers > C-level)
    static readonly maxDepth = 4;
    static readonly emptyPermissions = {
        [Permissions.administerSite]: false,
        [Permissions.administerGroups]: false,
        [Permissions.approveSchemaChanges]: false,
        [Permissions.approveEntryChanges]: false,
        [Permissions.proposeSchemaChanges]: false,
        [Permissions.proposeEntryChanges]: false,
    };

    static async validate(dbObject: RawVNode<typeof Group>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
        // Check the depth of this group:
        await tx.pullOne(Group, g => g.site(s=>s), {key: dbObject.id}).then(g => {
            if (g.site === null) {
                // The superclass validation should already have caught a missing Site, so the only reason Site would
                // be null here is if the "site" virtual prop isn't able to find the site, because the path between the
                // group and the site is longer than Group.maxDepth
                throw new Error(`User groups cannot be nested more than ${Group.maxDepth} levels deep.`);
            }
        });
    }

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        // Which Site or group owns this one.
        BELONGS_TO: {
            to: [Site, Group],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        HAS_USER: {
            to: [User],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static readonly virtualProperties = VNodeType.hasVirtualProperties({
        // The site that this group belongs to
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${Group.rel.BELONGS_TO}*1..${C(String(Group.maxDepth))}]->(@target:${Site})`,
            target: Site,
        },// The site that this group belongs to
        parentGroup: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${Group.rel.BELONGS_TO}]->(@target:${Group})`,
            target: Group,
        },
    });

}


export const UpdateGroup = defaultUpdateActionFor(Group, g => g
    .name
    .administerSite
    .administerGroups
    .approveSchemaChanges
    .approveEntryChanges
    .proposeSchemaChanges
    .proposeEntryChanges
    ,{
        otherUpdates: async (args: {
            // VNID or slugId of a Site or Group that this Group belongs to.
            belongsTo?: VNodeKey,
            // Add some users to this group:
            addUsers?: VNID[],
            // Remove some users from this group:
            removeUsers?: VNID[],
        }, tx, nodeSnapshot) => {
            const id = nodeSnapshot.id;
            const previousValues: Partial<typeof args> = {};

            // Relationship updates:

            // Change which Group/Site this Group belongs to (groups can be nested)
            if (args.belongsTo !== undefined) {

                // Helper function: given the key (VNID or slugId) of a Group or Site, return the VNID of the associated site
                const getSiteIdForGS = async (key: VNodeKey): Promise<VNID> => tx.queryOne(C`
                    MATCH (parent:VNode)-[:${Group.rel.BELONGS_TO}*0..${C(String(Group.maxDepth))}]->(site:${Site}), parent HAS KEY ${key}
                    WHERE parent:${Group} OR parent:${Site}
                `.RETURN({"site.id": "vnid"})).then(r => r["site.id"]);

                // args.belongsTo is the key of the parent (a Group or a Site). Groups can be nested.
                const prevBelongedTo = (await tx.updateToOneRelationship({
                    from: [Group, id],
                    rel: Group.rel.BELONGS_TO,
                    to: args.belongsTo,
                })).prevTo.key;

                // Check which site this will belong to.
                const newSiteId = await getSiteIdForGS(args.belongsTo);

                if (prevBelongedTo !== null) {
                    // Validate that the new parent (site or group) is the same site as before - groups cannot move
                    // between sites.
                    const prevSiteId = await getSiteIdForGS(prevBelongedTo);
                    if (prevSiteId !== newSiteId) {
                        throw new ValidationError("Cannot move Group from one site to another.");
                    }
                    previousValues.belongsTo = prevBelongedTo;
                }
            }

            if (args.addUsers) {
                // Add some users to this group:
                const added = await tx.query(C`
                    MATCH (u:${User}) WHERE u.id IN ${args.addUsers}
                    MATCH (g:${Group} {id: ${id}})
                    MERGE (g)-[:${Group.rel.HAS_USER}]->(u)
                `.RETURN({"u.id": "vnid"}));
                if (added.length !== args.addUsers.length) {
                    throw new ValidationError("Invalid user VNID given to addUser.");
                }
                previousValues.removeUsers = args.addUsers;
            }

            if (args.removeUsers) {
                // Remove some users from this group:
                const removed = await tx.query(C`
                MATCH (g:${Group} {id: ${id}})-[rel:${Group.rel.HAS_USER}]->(u:${User})
                WHERE u.id IN ${args.removeUsers}
                DELETE rel
                `.RETURN({"u.id": "vnid"}));
                if (removed.length !== args.removeUsers.length) {
                    throw new ValidationError("Invalid user VNID given to addUser.");
                }
                previousValues.addUsers = args.removeUsers;
            }

            return {previousValues};
        },
    }
);

export const [DeleteGroup, UnDeleteGroup] = defaultDeleteAndUnDeleteFor(Group);

export const CreateGroup = defaultCreateFor(Group, g => g
    .name
    .administerSite
    .administerGroups
    .approveSchemaChanges
    .approveEntryChanges
    .proposeSchemaChanges
    .proposeEntryChanges,
    UpdateGroup);
