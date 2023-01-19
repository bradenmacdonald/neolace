import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

import { LookupExpression } from "../base.ts";
import { GraphValue, LazyEntrySetValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * graph([entry or entry set])
 *
 * Given an entry, return the data required to graph that.
 */
export class Graph extends LookupFunctionOneArg {
    static functionName = "graph";
    /** An expression that specifies what entry/entries we want to display */
    public get entriesExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<GraphValue> {
        const entrySetQuery = await this.entriesExpr.getValueAs(LazyEntrySetValue, context);
        //  now get relationship set
        let graphData;
        try {
            graphData = await context.tx.queryOne(C`
                ${entrySetQuery.cypherQuery}
                WITH entry ${entrySetQuery.orderByClause} LIMIT 5000 // We limit graphs to 5,000 nodes.
                WITH collect(entry) AS entries

                // Find the reltionships _within_ the current set of entries:
                OPTIONAL MATCH (e1:${Entry})-[rel:${Entry.rel.RELATES_TO}|${Entry.rel.IS_A}]->(e2:${Entry}) WHERE e1 IN entries AND e2 IN entries
                // Now we have the relationships between the entries, but key data about each relationship is stored
                // on the corresponding PropertyFact and Property nodes, not on the relationship itself, so fetch those too:
                OPTIONAL MATCH (pf:${PropertyFact} {directRelNeo4jId: id(rel)})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
                WITH collect(rel {start: startNode(rel).id, end: endNode(rel).id, relId: pf.id, relTypeKey: prop.key}) AS rels, entries

                // Find the relationships that connect these entries to other entries, that we won't be returning yet.
                // Note that this is an _undirected_ relationship search
                OPTIONAL MATCH (e1:${Entry})-[rel:${Entry.rel.RELATES_TO}|${Entry.rel.IS_A}]-(e2:${Entry}) WHERE e1 IN entries AND NOT e2 IN entries
                OPTIONAL MATCH (pf:${PropertyFact} {directRelNeo4jId: id(rel)})-[:${PropertyFact.rel.FOR_PROP}]->(prop)

                WITH rels, entries, rel, prop, (CASE WHEN startNode(rel) IN entries THEN true ELSE false END) AS isOutbound

                WITH rels, entries,
                    (CASE WHEN isOutbound THEN startNode(rel).id ELSE endNode(rel).id END) AS entryId,
                    isOutbound,
                    prop.key AS relTypeKey,
                    count(*) AS entryCount
                WITH rels, entries, collect({ entryId: entryId, isOutbound: isOutbound, relTypeKey: relTypeKey, entryCount: entryCount }) AS borderingRelationships

                WITH rels, entries, borderingRelationships
                // Add the entry type information to the entries we are returning:
                UNWIND entries AS entry
                MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
                RETURN rels, collect(entry {.id, .name, entryTypeKey: et.key}) AS entries, borderingRelationships
            `.givesShape(
                {
                    rels: Field.List(
                        Field.Record({
                            start: Field.VNID,
                            end: Field.VNID,
                            relId: Field.VNID,
                            relTypeKey: Field.String,
                        }),
                    ),
                    entries: Field.List(
                        Field.Record({ id: Field.VNID, name: Field.String, entryTypeKey: Field.String }),
                    ),
                    borderingRelationships: Field.List(
                        Field.Record({
                            entryId: Field.VNID,
                            isOutbound: Field.Boolean,
                            relTypeKey: Field.VNID,
                            entryCount: Field.Int,
                        }),
                    ),
                },
            ));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                // There are no entries in the result.
                return new GraphValue([], [], []);
            }
            throw err; // Something else went wrong;
        }

        const entries = graphData.entries.map((entry) => {
            return {
                entryId: entry.id,
                name: entry.name,
                entryTypeKey: entry.entryTypeKey,
                // If this entry is the "current" entry, indicate that:
                ...(entry.id === context.entryId && { isFocusEntry: true }),
            };
        });

        const relationships = graphData.rels.map((rel) => {
            return {
                relId: rel.relId,
                relTypeKey: rel.relTypeKey,
                fromEntryId: rel.start,
                toEntryId: rel.end,
            };
        });

        return new GraphValue(entries, relationships, graphData.borderingRelationships);
    }
}
