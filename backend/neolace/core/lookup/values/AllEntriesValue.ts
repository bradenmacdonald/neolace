import { C, CypherQuery, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { AnnotationReviver, LazyEntrySetValue } from "./LazyEntrySetValue.ts";
import { makeCypherCondition } from "../../permissions/check.ts";
import { corePerm } from "../../permissions/permissions.ts";
import { Entry, EntryType, Site } from "../../mod.ts";

/**
 * A value that represents all the entries on a given site. It is a special case of "LazyEntrySetValue" (which is the
 * general class for a value representing set of entries). The whole reason this value exists as a special value
 * implementation is to be able to optimize queries like `allEntries().filter(entryType=...)` when used on sites with
 * millions of entries.
 */
export class AllEntriesFilterableValue extends LazyEntrySetValue {
    private constructor(
        context: LookupContext,
        /**
         * Where clauses: Cypher predicates like `entryType.key IN ["foo"]`, which will filter the set of entries to
         * enforce permissions or user-requested filters, like only retrieving one type of entries. The predicates can
         * reference 'entry', 'entryType', or 'site', which will be defined at this stage of the query.
         */
        private readonly whereClauses: CypherQuery[],
        options: {
            annotations?: Record<string, AnnotationReviver>;
            sourceExpression?: LookupExpression | undefined;
            sourceExpressionEntryId?: VNID | undefined;
        },
    ) {
        // We can assume there's always at least one WHERE clause, which would be at a minimum to check which entries
        // the user has permission to see. If it's a public site the WHERE clause may just be `true`.
        if (whereClauses.length < 0) throw new Error("Expected at least one WHERE clause");
        let query = C`
            MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
            WHERE ${whereClauses[0]}
        `;
        for (const whereClause of whereClauses.slice(1)) {
            query = C`${query} AND ${whereClause}`;
        }
        query = C`${query} WITH entry, {} AS annotations`;
        super(context, query, options);
    }

    public static async create(context: LookupContext, options: {
        annotations?: Record<string, AnnotationReviver>;
        sourceExpression?: LookupExpression | undefined;
        sourceExpressionEntryId?: VNID | undefined;
    }) {
        // Cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
        const entryPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
            "entryType",
        ]);
        return new AllEntriesFilterableValue(context, [entryPermissionPredicate], options);
    }

    /**
     * Add filters to this entry set, which can filter based on any property of 'entry', 'entryType', or 'annotations'
     * e.g. 'entry.id IN ${idSet}` or `entryType.key IN ${entryTypes}`
     * @param whereClauses
     * @returns
     */
    public cloneWithFilters(whereClauses: CypherQuery[]) {
        return new AllEntriesFilterableValue(this.context, [...this.whereClauses, ...whereClauses], {
            annotations: this.annotations,
            sourceExpression: this.sourceExpression,
            sourceExpressionEntryId: this.sourceExpressionEntryId,
        });
    }

    public cloneWithSourceExpression(
        sourceExpression: LookupExpression | undefined,
        sourceExpressionEntryId: VNID | undefined,
    ): LazyEntrySetValue {
        return new AllEntriesFilterableValue(this.context, this.whereClauses, {
            annotations: this.annotations,
            sourceExpression,
            sourceExpressionEntryId,
        });
    }
}
