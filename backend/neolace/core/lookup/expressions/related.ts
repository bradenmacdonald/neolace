import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";

import { LookupExpression } from "../expression.ts";
import { LazyEntrySetValue, IntegerValue, RelationshipTypeValue, NullValue, StringValue, InlineMarkdownStringValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";
import { LiteralExpression } from "./literal-expr.ts";


/**
 * Helper function to read annotated weight values from a database query result
 */
const dbWeightToValue = (dbValue: unknown): IntegerValue|NullValue => {
    if (typeof dbValue === "bigint") {
        return new IntegerValue(dbValue);
    } else if (dbValue === null) {
        return new NullValue();
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'weight' while evaluating lookup.");
    }
}

/**
 * Helper function to read annotated note (markdown string) values from a database query result
 */
const dbNoteToValue = (dbValue: unknown): InlineMarkdownStringValue|NullValue => {
    if (typeof dbValue === "string") {
        return new InlineMarkdownStringValue(dbValue);
    } else if (dbValue === null) {
        return new NullValue();
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'note' while evaluating lookup.");
    }
}

/**
 * related(entry): given an entry or set of entries (the "from entries") and a relationship type, follow the direct
 * relationships of that type from the "from entries" to the "related entries" and return the "related entries".
 * 
 * e.g. if Lion IS A Mammal (there is an IS_A relationship FROM "Lion" TO "Mammal"), then related(lion, via=IS_A)
 * will return [Mammal].
 * 
 * For directed relationships like IS_A, this will follow relationships in both directions. To limit to relationships
 * "from" or "to" this entry, specify direction="from" or direction="to"
 */
 export class RelatedEntries extends LookupExpression {

    // An expression that specifies what entry(ies)' related entries we want to retrieve
    readonly fromEntriesExpr: LookupExpression;
    readonly viaRelTypeExpr: LookupExpression;
    readonly directionExpr?: LookupExpression;

    static defaultDirection = new LiteralExpression(new StringValue("both"));

    constructor(fromEntriesExpr: LookupExpression, extraParams: {via: LookupExpression, direction?: LookupExpression}) {
        super();
        this.fromEntriesExpr = fromEntriesExpr;
        this.viaRelTypeExpr = extraParams.via;
        this.directionExpr = extraParams.direction;
    }

    public async getValue(context: LookupContext) {
        const startingEntrySet = await this.fromEntriesExpr.getValueAs(context, LazyEntrySetValue);
        const viaRelType = await this.viaRelTypeExpr.getValueAs(context, RelationshipTypeValue);
        const direction = this.directionExpr ? (await this.directionExpr.getValueAs(context, StringValue)).value : "both";

        let queryMatch;
        if (direction === "both") {
            queryMatch = C`
                MATCH (fromEntry)-[:${Entry.rel.REL_FACT}]-(relFact:VNode)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:${RelationshipType} {id: ${viaRelType.id}}),
                (relFact)-[:${RelationshipFact.rel.REL_FACT}]-(entry:VNode)
            `;
        } else if (direction === "from") {
            queryMatch = C`
                MATCH (fromEntry)-[:${Entry.rel.REL_FACT}]->(relFact:VNode)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:${RelationshipType} {id: ${viaRelType.id}}),
                (relFact)-[:${RelationshipFact.rel.REL_FACT}]->(entry:VNode)
            `;
        } else if (direction === "to") {
            queryMatch = C`
                MATCH (fromEntry)<-[:${Entry.rel.REL_FACT}]-(relFact:VNode)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:${RelationshipType} {id: ${viaRelType.id}}),
                (relFact)<-[:${RelationshipFact.rel.REL_FACT}]-(entry:VNode)
            `;
        } else {
            throw new LookupEvaluationError(`Invalid direction value passed to related(): "${direction}"`);
        }

        return new LazyEntrySetValue(context, C`
            ${startingEntrySet.cypherQuery}
            WITH entry AS fromEntry  // Continue the existing entry query, discard annotations if present
            ${queryMatch}
            WITH entry, {weight: relFact.weight, note: relFact.noteMD} AS annotations
            ORDER BY annotations.weight DESC, entry.name
        `, {annotations: {weight: dbWeightToValue, note: dbNoteToValue}});
    }

    public toString(): string {
        return `related(${this.fromEntriesExpr.toString()}, via=${this.viaRelTypeExpr.toString()}${this.directionExpr ? `, direction=${this.directionExpr.toString()}` : ""})`;
    }
}
