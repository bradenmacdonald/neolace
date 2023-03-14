/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import {
    Field,
    getRelationshipType,
    RawRelationships,
    RawVNode,
    RelationshipDeclaration,
    ValidationError,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";

/**
 * Common code for VNodeTypes that use site-specific 'key' string as a secondary key.
 */
export const keyProps = {
    /**
     * The VNID of the site with which this Property is associated. This just exists so that Neo4j can create a
     * unique constraint on [site, key]. This should always be the same as the ID of the associated site
     * node: (this)-FOR_SITE->(:Site)
     */
    siteNamespace: Field.VNID,
    /** The site-specific identifier for this Property. Cannot be changed. */
    key: Field.Slug,
};

export const keyMigration = (label: string) => {
    const constraintName = `${label.toLowerCase()}_key_uniq`;
    return {
        forward: async (dbWrite: (query: string) => Promise<unknown>) => {
            await dbWrite(
                `CREATE CONSTRAINT ${constraintName} FOR (vn:${label}) REQUIRE (vn.siteNamespace, vn.key) IS UNIQUE`,
            );
        },
        backward: async (dbWrite: (query: string) => Promise<unknown>) => {
            await dbWrite(`DROP CONSTRAINT ${constraintName} IF EXISTS`);
        },
        dependsOn: [],
    };
};

export function validateSiteNamespace<VNT extends VNodeType>(
    vnt: VNT,
    dbObject: RawVNode<VNT>,
    relationships: RawRelationships[],
    siteRelationship: RelationshipDeclaration,
) {
    // Validate that siteNamespace is correct.
    const forSiteRel = relationships.find((r) => r.relType === getRelationshipType(siteRelationship));
    const siteId = forSiteRel?.targetId;
    if (siteId !== dbObject.siteNamespace || siteId === undefined) {
        throw new ValidationError(`${vnt.name} has incorrect siteNamespace.`);
    }
}
