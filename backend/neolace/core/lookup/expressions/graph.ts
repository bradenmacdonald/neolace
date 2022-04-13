import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import { GraphValue, LazyEntrySetValue } from "../values.ts";
import { LookupContext } from "../context.ts";
import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";

/**
 * graph([entry or entry set])
 *
 * Given an entry, return the data required to graph that.
 */
export class Graph extends LookupExpression {
    // An expression that specifies what entry/entries we want to display
    readonly entriesExpr: LookupExpression;

    constructor(
        entriesExpr: LookupExpression,
        // extraParams: {},
    ) {
        super();
        this.entriesExpr = entriesExpr;
    }

    public async getValue(context: LookupContext): Promise<GraphValue> {
        const entrySetQuery = await this.entriesExpr.getValueAs(LazyEntrySetValue, context);
        //  now get relationship set
        const graphData = await context.tx.queryOne(C`
            ${entrySetQuery.cypherQuery}
            WITH collect(entry) AS entries
            MATCH (e1:${Entry})-[rel:${Entry.rel.RELATES_TO}|${Entry.rel.IS_A}]->(e2:${Entry}) WHERE e1 IN entries AND e2 IN entries
            WITH collect(rel {start: startNode(rel).id, end: endNode(rel).id}) AS rels, entries
            RETURN rels, entries
        `.givesShape(
            {
                rels: Field.List(Field.Record({ start: Field.VNID, end: Field.VNID })),
                entries: Field.List(Field.VNode(Entry)),
            },
        ));

        const entries = graphData.entries.map((entry) => {
            return {
                entryId: entry.id,
                name: entry.name,
                entryType: VNID(),
                data: {},
            };
        });

        const relationships = graphData.rels.map((rel) => {
            return {
                relId: VNID(),
                relType: VNID(),
                fromEntryId: rel.start,
                toEntryId: rel.end,
                data: {},
            };
        });

        return new GraphValue(entries, relationships);
    }

    public toString(): string {
        return `graph(${this.entriesExpr.toString()})`;
    }
}
