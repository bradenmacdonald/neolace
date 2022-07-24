import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { AbstractLazyCypherQueryValue, ConcreteValue } from "./base.ts";
import { AnnotatedValue } from "./AnnotatedValue.ts";
import { EntryValue } from "./EntryValue.ts";

/**
 * An annotation reviver is a function that converts a single raw value loaded from the Neo4j database into a
 * concrete lookup value, e.g. bigint -> IntegerValue
 *
 * It is only used with LazyEntrySetValue
 */
type AnnotationReviver = (annotatedValue: unknown) => ConcreteValue | undefined;

/**
 * A cypher query that evaluates to a set of entries, with optional annotations (extra data associated with each entry)
 */
export class LazyEntrySetValue extends AbstractLazyCypherQueryValue {
    readonly annotations: Readonly<Record<string, AnnotationReviver>> | undefined;

    constructor(
        context: LookupContext,
        cypherQuery: CypherQuery,
        options: {
            annotations?: Record<string, AnnotationReviver>;
            sourceExpression?: LookupExpression | undefined;
            sourceExpressionEntryId?: VNID | undefined;
        },
    ) {
        super(context, cypherQuery, options.sourceExpression, options.sourceExpressionEntryId);
        this.annotations = options.annotations;
    }

    public async getSlice(offset: bigint, numItems: bigint): Promise<Array<EntryValue | AnnotatedValue>> {
        const query = C`
            ${this.cypherQuery}
            RETURN entry.id, annotations
            ${this.getSkipLimitClause(offset, numItems)}
        `.givesShape({ "entry.id": Field.VNID, annotations: Field.Any });
        const result = await this.context.tx.query(query);

        return result.map((r) => {
            if (this.annotations) {
                const annotatedValues: Record<string, ConcreteValue> = {};
                for (const key in this.annotations) {
                    const value = this.annotations[key](r.annotations[key]);
                    if (value !== undefined) {
                        annotatedValues[key] = value;
                    }
                }
                return new AnnotatedValue(new EntryValue(r["entry.id"]), annotatedValues);
            } else {
                return new EntryValue(r["entry.id"]);
            }
        });
    }

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression | undefined,
        sourceExpressionEntryId: VNID | undefined,
    ): LazyEntrySetValue {
        return new LazyEntrySetValue(this.context, this.cypherQuery, {
            annotations: this.annotations,
            sourceExpression,
            sourceExpressionEntryId,
        });
    }
}
