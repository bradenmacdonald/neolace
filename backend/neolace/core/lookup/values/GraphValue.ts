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
            data: Record<string, unknown>;
        }[],
        public readonly rels: {
            relId: VNID;
            relType: VNID;
            fromEntryId: VNID;
            toEntryId: VNID;
            data: Record<string, unknown>;
        }[],
    ) {
        super();
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for a graph
    }

    protected serialize(): Omit<api.GraphValue, "type"> {
        return {
            entries: this.entries,
            rels: this.rels,
        };
    }
}
