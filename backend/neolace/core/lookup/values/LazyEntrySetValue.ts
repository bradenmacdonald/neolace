/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, CypherQuery, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { AbstractLazyCypherQueryValue, ConcreteValue } from "./base.ts";
import { AnnotatedValue } from "./AnnotatedValue.ts";
import { EntryValue } from "./EntryValue.ts";
import { Entry, EntryType } from "neolace/core/mod.ts";

/**
 * An annotation data converter is a function that converts a single raw value loaded from the Neo4j database into a
 * concrete lookup value, e.g. bigint -> IntegerValue
 *
 * It is only used with LazyEntrySetValue and subclasses.
 */
export type AnnotationDataConverter = (annotatedValue: unknown) => ConcreteValue | undefined;

/**
 * A cypher query that evaluates to a set of entries, with optional annotations (extra data associated with each entry)
 */
export class LazyEntrySetValue extends AbstractLazyCypherQueryValue {
    readonly annotations: Readonly<Record<string, AnnotationDataConverter>> | undefined;
    public readonly orderByClause: CypherQuery;

    constructor(
        context: LookupContext,
        /**
         * A cypher query, which MUST contain two variables, 'entry' and 'annotations', where entry refers to each entry
         * that will be in the results, and annotations is the map of additional (optional) data associated with each.
         */
        public readonly cypherQuery: CypherQuery,
        options: {
            /**
             * Annotations are extra data associated with each entry in the context of this particular query. For
             * example, if retrieving a bunch of entries via a relationship property, there may be a 'note' associated
             * with one of the entries, which would be an annotation on that entry. There would also be a 'rank'
             * associated with each entry, indicating the order that the entries are listed for that relationship
             * property value. Such annotations are always context-specific, so the same entry may have totally
             * different annotations or no annotations at all, depending on where it is used / how it is queried.
             *
             * The annotation data must be present in each row of the query as a map called 'annotations', and this
             * optional argument is used to provide a list of the annotation values and a function for converting each
             * one from its Neo4j data type to a LookupValue. That function is called an AnnotationDataConverter.
             */
            annotations?: Record<string, AnnotationDataConverter>;
            /**
             * A cypher clause that starts with ORDER BY. This will be used to sort the entries, unless we are just
             * retrieving the total count in which case ordering is skipped as an optimization. If no ordering is
             * specified, the entries will be ordered by name.
             */
            orderByClause?: CypherQuery;
            sourceExpression?: LookupExpression | undefined;
            sourceExpressionEntryId?: VNID | undefined;
        },
    ) {
        super(context, options.sourceExpression, options.sourceExpressionEntryId);
        this.annotations = options.annotations;
        // By default we sort entries by name, with a secondary sort on the internal ID to ensure consistent ordering of
        // entries that have the same name. We used `id(entry)` instead of `entry.id` because it's slightly faster and
        // it doesn't matter which ID is used, as long as it's stable.
        this.orderByClause = options.orderByClause ?? C`ORDER BY entry.name, id(entry)`;
    }

    public async runQuery(
        offset: bigint,
        numItems: bigint,
    ): Promise<{ values: Array<EntryValue | AnnotatedValue>; totalCount: bigint }> {
        if (numItems === 0n) {
            const countQuery = await this.context.tx.queryOne(this.cypherQuery.RETURN({ "count(*)": Field.BigInt }));
            return { values: [], totalCount: countQuery["count(*)"] };
        }

        const query = C`
            ${this.cypherQuery}
            WITH entry, annotations
            ${this.orderByClause}
            WITH collect({entry: entry, annotations: annotations}) AS rows
            WITH rows[${C(String(offset))}..${C(String(offset + numItems))}] AS selectedRows, size(rows) AS totalCount
            UNWIND selectedRows AS row
            RETURN row.entry.id AS entryId, row.annotations AS annotations, totalCount
        `.givesShape({ "entryId": Field.VNID, annotations: Field.Any, totalCount: Field.BigInt });

        // The following alternative query uses the exact same number of "dbHits" but WAY more memory, so don't use it:
        // const query = C`
        //     ${this.cypherQuery}
        //     WITH collect({entry: entry, annotations: annotations}) AS rows, count(entry) AS totalCount
        //     UNWIND rows AS row
        //     WITH totalCount, row.entry AS entry, row.annotations AS annotations
        //     RETURN entry.id, annotations, totalCount
        //     ${this.orderByClause}
        //     ${this.getSkipLimitClause(offset, numItems)}
        // `.givesShape({ "entry.id": Field.VNID, annotations: Field.Any, totalCount: Field.BigInt });
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
                return new AnnotatedValue(new EntryValue(r["entryId"]), annotatedValues);
            } else {
                return new EntryValue(r["entryId"]);
            }
        });
        return { values, totalCount: result.length > 0 ? result[0].totalCount : 0n };
    }

    public async getSlice(offset: bigint, numItems: bigint): Promise<(EntryValue | AnnotatedValue)[]> {
        // We only override this function to indicate more specific return type than LookupValue[].
        return super.getSlice(offset, numItems) as Promise<(EntryValue | AnnotatedValue)[]>;
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
