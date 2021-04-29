import * as Joi from "@hapi/joi";

import {
    VNodeType,
    defaultUpdateActionFor,
    defaultDeleteAndUnDeleteFor,
    defaultCreateFor,
    UUID,
    C,
    ValidationError,
    VNodeTypeRef,
} from "vertex-framework";

// Forward reference
export const GroupRef: typeof Group = VNodeTypeRef("Group");
import { SiteRef as Site } from "./Site";
import { User } from "./User";

@VNodeType.declare
export class Group extends VNodeType {
    static readonly label = "Group";
    static readonly properties = {
        ...VNodeType.properties,
        // Name of this group
        name: Joi.string().max(200),
        // Admin-level permissions:
        administerSite: Joi.boolean().required(),  // Can set properties of the site like domain name, name, private/public, etc.
        administerGroups: Joi.boolean().required(),  // Can administer users and groups on this site:
        approveSchemaChanges: Joi.boolean().required(),  // Can approve change requests related to the site schema
        approveEntryChanges: Joi.boolean().required(),  // Can approve change requests related to the site content
        // Normal user level permissions:
        proposeSchemaChanges: Joi.boolean().required(),
        proposeEntryChanges: Joi.boolean().required(),
        // future permission: participate in discussions

        // Membership in _any_ group grants permission to view entries and schema on the site
    };

    // static async validate(dbObject: RawVNode<typeof Group>, tx: WrappedTransaction): Promise<void> {
    //     await super.validate(dbObject, tx);
    // }

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
            // UUID or shortId of a Site or Group that this Group belongs to.
            belongsTo?: string|UUID,
            // Add some users to this group:
            addUsers?: UUID[],
            // Remove some users from this group:
            removeUsers?: UUID[],
        }, tx, nodeSnapshot) => {
            const uuid = nodeSnapshot.uuid;
            const previousValues: Partial<typeof args> = {};

            // Relationship updates:

            // Change which Group/Site this Group belongs to (groups can be nested)
            if (args.belongsTo !== undefined) {

                // Helper function: given the key (UUID or shortId) of a Group or Site, return the UUID of the associated site
                const getSiteUuidForGS = async (key: string|UUID): Promise<UUID> => tx.queryOne(C`
                    MATCH (parent:VNode)-[:${Group.rel.BELONGS_TO}*0..5]->(site:${Site}), parent HAS KEY ${key}
                    WHERE parent:${Group} OR parent:${Site}
                `.RETURN({"site.uuid": "uuid"})).then(r => r["site.uuid"]);

                // args.belongsTo is the key of the parent (a Group or a Site). Groups can be nested.
                const prevBelongedTo = (await tx.updateToOneRelationship({
                    from: [Group, uuid],
                    rel: Group.rel.BELONGS_TO,
                    to: args.belongsTo,
                })).prevTo.key;

                // Check which site this will belong to. This also serves to prevent groups from being nested more
                // than five levels deep.
                const newSiteUUID = await getSiteUuidForGS(args.belongsTo);

                if (prevBelongedTo !== null) {
                    // Validate that the new parent (site or group) is the same site as before - groups cannot move
                    // between sites.
                    const prevSiteUUID = await getSiteUuidForGS(prevBelongedTo);
                    if (prevSiteUUID !== newSiteUUID) {
                        throw new ValidationError("Cannot move Group from one site to another.");
                    }
                    previousValues.belongsTo = prevBelongedTo;
                }
            }

            if (args.addUsers) {
                // Add some users to this group:
                const added = await tx.query(C`
                    MATCH (u:${User}) WHERE u.uuid IN ${args.addUsers}
                    MATCH (g:${Group} {uuid: ${uuid}})
                    MERGE (g)-[:${Group.rel.HAS_USER}]->(u)
                `.RETURN({"u.uuid": "uuid"}));
                if (added.length !== args.addUsers.length) {
                    throw new ValidationError("Invalid user UUID given to addUser.");
                }
                previousValues.removeUsers = args.addUsers;
            }

            if (args.removeUsers) {
                // Remove some users from this group:
                const removed = await tx.query(C`
                MATCH (g:${Group} {uuid: ${uuid}})-[rel:${Group.rel.HAS_USER}]->(u:${User})
                WHERE u.uuid IN ${args.removeUsers}
                DELETE rel
                `.RETURN({"u.uuid": "uuid"}));
                if (removed.length !== args.removeUsers.length) {
                    throw new ValidationError("Invalid user UUID given to addUser.");
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
