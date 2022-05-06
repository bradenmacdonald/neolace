import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import { GraphValue, LazyEntrySetValue } from "../values.ts";
import { LookupContext } from "../context.ts";
import { C, Field } from "neolace/deps/vertex-framework.ts";
import { PropertyFact } from "../../entry/PropertyFact.ts";
import { EntryType } from "../../schema/EntryType.ts";

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
            // Now we have the relationships between the entries, but key data about each relationship is stored
            // on the corresponding PropertyFact and Property nodes, not on the relationship itself, so fetch those too:
            MATCH (pf:${PropertyFact} {directRelNeo4jId: id(rel)})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            WITH collect(rel {start: startNode(rel).id, end: endNode(rel).id, relId: pf.id, relType: prop.id}) AS rels, entries
            WITH rels, entries
            // Add the entry type information to the entries we are returning:
            UNWIND entries AS entry
            MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            RETURN rels, collect(entry {.id, .name, type: et.id}) AS entries
        `.givesShape(
            {
                rels: Field.List(
                    Field.Record({ start: Field.VNID, end: Field.VNID, relId: Field.VNID, relType: Field.VNID }),
                ),
                entries: Field.List(Field.Record({ id: Field.VNID, name: Field.String, type: Field.VNID })),
            },
        ));

        const entries = graphData.entries.map((entry) => {
            return {
                entryId: entry.id,
                name: entry.name,
                entryType: entry.type,
                data: {},
            };
        });

        const relationships = graphData.rels.map((rel) => {
            return {
                relId: rel.relId,
                relType: rel.relType,
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
