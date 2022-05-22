import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import { LookupExpression } from "../expression.ts";
import { AbstractLazyCypherQueryValue, ConcreteValue } from "./base.ts";
import { AnnotatedValue } from "./AnnotatedValue.ts";
import { EntryValue } from "./EntryValue.ts";

/**
 * An annotation reviver is a function that converts a single raw value loaded from the Neo4j database into a
 * concrete lookup value, e.g. bigint -> IntegerValue
 *
 * It is only used with LazyEntrySetValue
 */
type AnnotationReviver = (annotatedValue: unknown) => ConcreteValue;

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
            sourceExpression?: LookupExpression;
            sourceExpressionEntryId?: VNID;
        } = {},
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
                    annotatedValues[key] = this.annotations[key](r.annotations[key]);
                }
                return new AnnotatedValue(new EntryValue(r["entry.id"]), annotatedValues);
            } else {
                return new EntryValue(r["entry.id"]);
            }
        });
    }
}
