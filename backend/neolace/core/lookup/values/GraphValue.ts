/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-sdk.ts";
import { ConcreteValue } from "./base.ts";

/**
 * A graph value, contains the data required to visualize one or more entries on a graph
 */
export class GraphValue extends ConcreteValue {
    constructor(
        public readonly entries: {
            entryId: VNID;
            name: string;
            entryTypeKey: string;
            isFocusEntry?: boolean;
        }[],
        public readonly rels: {
            relId: VNID;
            relTypeKey: string;
            fromEntryId: VNID;
            toEntryId: VNID;
        }[],
        /**
         * Information about entries which are NOT in the current set of graphed entries but which are linked to them.
         * These are relationships that the user may wish to "expand" to load more nodes into the graph.
         */
        public readonly borderingRelationships: {
            entryId: VNID;
            /**
             * If this is an "outbound" relationship, it's a normal relationship FROM entryId to other entries.
             * If this is false, it's a reverse relationship - from various other entries TO entryId.
             */
            isOutbound: boolean;
            relTypeKey: string;
            entryCount: number;
        }[],
    ) {
        super();
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a graph
    }

    protected serialize(): api.GraphValue {
        return {
            type: "Graph",
            entries: this.entries,
            rels: this.rels,
            borderingRelationships: this.borderingRelationships,
        };
    }
}
