import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { AbstractLazyCypherQueryValue, ConcreteValue } from "./base.ts";
import { AnnotatedValue } from "./AnnotatedValue.ts";
import { EntryValue } from "./EntryValue.ts";
import { Entry, EntryType } from "neolace/core/mod.ts";

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
    public readonly orderByClause: CypherQuery;

    constructor(
        context: LookupContext,
        public readonly cypherQuery: CypherQuery,
        options: {
            annotations?: Record<string, AnnotationReviver>;
            orderByClause?: CypherQuery;
            sourceExpression?: LookupExpression | undefined;
            sourceExpressionEntryId?: VNID | undefined;
        },
    ) {
        super(context, options.sourceExpression, options.sourceExpressionEntryId);
        this.annotations = options.annotations;
        this.orderByClause = options.orderByClause ?? C`ORDER BY entry.name, id(entry)`;
    }

    public async runQuery(
        offset: bigint,
        numItems: bigint,
    ): Promise<{ values: Array<EntryValue | AnnotatedValue>; totalCount: bigint }> {

        if (numItems === 0n) {
            const countQuery = await this.context.tx.queryOne(this.cypherQuery.RETURN({"count(*)": Field.BigInt}));
            return {values: [], totalCount: countQuery["count(*)"]};
        }

        const query = C`
            ${this.cypherQuery}
            WITH collect({entry: entry, annotations: annotations}) AS rows, count(entry) AS totalCount
            UNWIND rows AS row
            WITH totalCount, row.entry AS entry, row.annotations AS annotations
            RETURN entry.id, annotations, totalCount
            ${this.orderByClause}
            ${this.getSkipLimitClause(offset, numItems)}
        `.givesShape({ "entry.id": Field.VNID, annotations: Field.Any, totalCount: Field.BigInt });
        const result = await this.context.tx.query(query);

        const values = result.map((r) => {
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
        return { values, totalCount: result.length > 0 ? result[0].totalCount : 0n };
    }

    /**
     * Add filters to this entry set, which can filter based on any property of 'entry', 'entryType', or 'annotations'
     * e.g. 'entry.id IN ${idSet}` or `entryType.key IN ${entryTypes}`
     * @param whereClauses
     * @returns
     */
    public cloneWithFilters(whereClauses: CypherQuery[]) {
        let cypherQuery = C`
            ${this.cypherQuery}
            MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
        `;
        if (whereClauses.length > 0) {
            cypherQuery = C`${cypherQuery} WHERE ${whereClauses[0]}`;
        }
        for (let i = 1; i < whereClauses.length; i++) {
            cypherQuery = C`${cypherQuery} AND ${whereClauses[i]}`;
        }
        cypherQuery = C`${cypherQuery} WITH entry, annotations`;
        return new LazyEntrySetValue(this.context, cypherQuery, {
            annotations: this.annotations,
            orderByClause: this.orderByClause,
            sourceExpression: this.sourceExpression,
            sourceExpressionEntryId: this.sourceExpressionEntryId,
        });
    }

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression | undefined,
        sourceExpressionEntryId: VNID | undefined,
    ): LazyEntrySetValue {
        return new LazyEntrySetValue(this.context, this.cypherQuery, {
            annotations: this.annotations,
            orderByClause: this.orderByClause,
            sourceExpression,
            sourceExpressionEntryId,
        });
    }
}
