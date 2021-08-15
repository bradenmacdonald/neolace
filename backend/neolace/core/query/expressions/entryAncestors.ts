import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { QueryExpression } from "../expression.ts";
import { EntrySetValue } from "../values.ts";

/**
 * entryAncestors(): returns the ancestors of the current entry (entries that the current entry has a IS_A relationnship
 * to, and entries they have an IS_A relationship to, and so on).
 */
 export class EntryAncestors extends QueryExpression {

    public getValue() {
        const maxDepth = 50;

        return new EntrySetValue(C`
            MATCH (entry:${Entry} {id: $entryId})
            MATCH path = (entry)-[:${Entry.rel.IS_A}*..${C(String(maxDepth))}]->(ancestor:${Entry})
            WHERE ancestor <> entry  // Never return the starting node as its own ancestor, if the graph is cyclic
            // We want to only return DISTINCT ancestors, and return only the minimum distance to each one.
            WITH ancestor, min(length(path)) AS distance
            ORDER BY distance, ancestor.name

            WITH ancestor AS entry, distance
        `, true);
    }

    public asString(): string {
        return "entryAncestors()";
    }
}
