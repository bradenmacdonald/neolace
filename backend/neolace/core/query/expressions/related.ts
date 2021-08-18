import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";

import { QueryExpression } from "../expression.ts";
import { LazyEntrySetValue, IntegerValue, RelationshipTypeValue, NullValue } from "../values.ts";
import { QueryEvaluationError } from "../errors.ts";
import { QueryContext } from "../context.ts";


/**
 * Helper function to read annotated weight values from a database query result
 */
const dbWeightToValue = (dbValue: unknown): IntegerValue|NullValue => {
    if (typeof dbValue === "bigint") {
        return new IntegerValue(dbValue);
    } else if (dbValue === null) {
        return new NullValue();
    } else {
        throw new QueryEvaluationError("Unexpected data type for 'weight' while evaluating Query Expression.");
    }
}

/**
 * related(entry): given an entry or set of entries (the "from entries") and a relationship type, follow the direct
 * relationships of that type from the "from entries" to the "related entries" and return the "related entries".
 * 
 * e.g. if Lion IS A Mammal (there is an IS_A relationship FROM "Lion" TO "Mammal"), then related(lion, via=IS_A)
 * will return [Mammal].
 */
 export class RelatedEntries extends QueryExpression {

    // An expression that specifies what entry(ies)' related entries we want to retrieve
    readonly fromEntriesExpr: QueryExpression;
    readonly viaRelTypeExpr: QueryExpression;

    constructor(fromEntriesExpr: QueryExpression, extraParams: {via: QueryExpression}) {
        super();
        this.fromEntriesExpr = fromEntriesExpr;
        this.viaRelTypeExpr = extraParams.via;
    }

    public async getValue(context: QueryContext) {
        const startingEntrySet = await this.fromEntriesExpr.getValueAs(context, LazyEntrySetValue);
        const viaRelType = await this.viaRelTypeExpr.getValueAs(context, RelationshipTypeValue);

        return new LazyEntrySetValue(context, C`
            ${startingEntrySet.cypherQuery}
            WITH entry AS fromEntry  // Continue the existing entry query, discard annotations if present

            MATCH (fromEntry)-[:${Entry.rel.REL_FACT}]->(relFact:VNode)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:${RelationshipType} {id: ${viaRelType.id}}),
                (relFact)-[:${RelationshipFact.rel.REL_FACT}]->(entry:VNode)
            WITH entry, {weight: relFact.weight} AS annotations
            ORDER BY annotations.weight DESC, entry.name
        `, {annotations: {weight: dbWeightToValue}});
    }

    public toString(): string {
        return `related(${this.fromEntriesExpr.toString()}, via=${this.viaRelTypeExpr.toString()})`;
    }
}
