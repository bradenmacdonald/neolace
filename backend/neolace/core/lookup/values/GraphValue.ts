import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-api.ts";
import { ConcreteValue } from "./base.ts";

/**
 * A graph value, contains the data required to visualize one or more entries on a graph
 */
export class GraphValue extends ConcreteValue {
    constructor(
        public readonly entries: {
            entryId: VNID;
            name: string;
            entryType: VNID;
            isFocusEntry?: boolean;
        }[],
        public readonly rels: {
            relId: VNID;
            relType: VNID;
            fromEntryId: VNID;
            toEntryId: VNID;
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
        };
    }

    public override getSortString(): string {
        return ""; // doesn't really make sense to sort by graph values.
    }
}
