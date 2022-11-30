import { C, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupExpression } from "../base.ts";
import { EntryTypeValue, EntryValue, LazyEntrySetValue, LazyIterableValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { iterateOver } from "../../values/base.ts";

/**
 * filter(entries, entryType=[entry type or list of entry types])
 *
 * Given a set of entries, return only those that are of the specified type.
 */
export class Filter extends LookupFunctionWithArgs {
    static functionName = "filter";

    /** The iterable value to filter  (e.g. a set of entries) */
    public get iterableExpr(): LookupExpression {
        return this.firstArg;
    }
    /** The entry type(s) to keep */
    public get entryTypeExpr(): LookupExpression | undefined {
        return this.otherArgs["entryType"];
    }
    /** The entry type(s) to exclude */
    public get excludeEntryTypeExpr(): LookupExpression | undefined {
        return this.otherArgs["excludeEntryType"];
    }
    /** Exclude specific values */
    public get excludeExpr(): LookupExpression | undefined {
        return this.otherArgs["exclude"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["entryType", "excludeEntryType", "exclude"] });
    }

    public async getValue(context: LookupContext): Promise<LazyEntrySetValue> {
        const iterable = await this.iterableExpr.getValueAs(LazyEntrySetValue, context);
        let cypherQuery = iterable.cypherQuery;

        if (this.entryTypeExpr) {
            const entryTypes = await getEntryTypesKeys(this.entryTypeExpr, context);

            cypherQuery = C`
                ${cypherQuery}
                MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
                WHERE entryType.key IN ${Array.from(entryTypes)}
                WITH entry, annotations
            `;
        }

        if (this.excludeEntryTypeExpr) {
            const notEntryTypes = await getEntryTypesKeys(this.excludeEntryTypeExpr, context);

            cypherQuery = C`
                ${cypherQuery}
                MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
                WHERE NOT entryType.key IN ${Array.from(notEntryTypes)}
                WITH entry, annotations
            `;
        }

        if (this.excludeExpr) {
            const notEntries = new Set<VNID>();
            for await (const value of iterateOver(await this.excludeExpr.getValueAs(LazyEntrySetValue, context))) {
                const asEntry = await value.castTo(EntryValue, context);
                if (asEntry === undefined) {
                    throw new LookupEvaluationError(`Expected an entry value but got ${value.constructor.name}`);
                }
                notEntries.add(asEntry.id);
            }

            cypherQuery = C`
                ${cypherQuery}
                WITH entry, annotations
                WHERE NOT entry.id IN ${Array.from(notEntries)}
                WITH entry, annotations
            `;
        }

        return new LazyEntrySetValue(context, cypherQuery, {
            annotations: iterable.annotations,
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
        });
    }
}

/**
 * Given an expression that is either an entry type literal or a list/iterable of entry types, return the unique set
 * of entry type keys.
 */
async function getEntryTypesKeys(expr: LookupExpression, context: LookupContext): Promise<Set<string>> {
    const entryTypesValue = await expr.getValueAsOneOf([EntryTypeValue, LazyIterableValue], context);
    const entryTypes = new Set<string>();
    if (entryTypesValue instanceof LazyIterableValue) {
        for await (const value of iterateOver(entryTypesValue)) {
            const asEntryType = await value.castTo(EntryTypeValue, context);
            if (asEntryType === undefined) {
                throw new LookupEvaluationError(`Expected an entry type but got ${value.constructor.name}`);
            }
            entryTypes.add(asEntryType.key);
        }
    } else {
        entryTypes.add(entryTypesValue.key);
    }
    return entryTypes;
}
