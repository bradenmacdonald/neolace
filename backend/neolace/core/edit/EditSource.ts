/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, RawRelationships, RawVNode, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";

/**
 * An Edit source is thing that edits are attached to - either a Draft, Connection, or just the "System Source"
 */
export class EditSource extends VNodeType {
    static readonly label: string = "EditSource";

    static readonly properties = { ...VNodeType.properties };

    static readonly rel = this.hasRelationshipsFromThisTo({
        FOR_SITE: {
            to: [Site],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        // appliedEdits: {
        //     type: VirtualPropType.ManyRelationship,
        //     target: AppliedEdit,
        //     query: C`(@this)<-[:${this.rel.HAS_EDIT_SOURCE}]-(@target:${AppliedEdit})`,
        //     defaultOrderBy: `@target.timestamp`,
        // },
        site: {
            type: VirtualPropType.OneRelationship,
            target: Site,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target:${Site})`,
        },
    });

    static override async validate(_rawNode: RawVNode<typeof this>, _rels: RawRelationships[]): Promise<void> {
        // No custom validation
    }
}

/**
 * The System Source is the default source used for edits made on a particular site. If the edits don't come from a
 * particular Draft or Connection or Import, they come from the system source.
 */
export class SystemSource extends EditSource {
    static readonly label = "SystemSource";
}
