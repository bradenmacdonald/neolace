import { C, VNID } from "neolace/deps/vertex-framework.ts";
import { LookupExpression } from "../base.ts";
import { EntryTypeValue, LazyEntrySetValue, LazyIterableValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

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

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["entryType"] });
    }

    public async getValue(context: LookupContext) {
        let iterable = await this.iterableExpr.getValueAs(LazyEntrySetValue, context);

        if (this.entryTypeExpr) {
            const entryTypesValue = await this.entryTypeExpr.getValueAsOneOf(
                [EntryTypeValue, LazyIterableValue],
                context,
            );
            const entryTypes = new Set<VNID>();
            if (entryTypesValue instanceof LazyIterableValue) {
                for await (const value of entryTypesValue) {
                    const asEntryType = await value.castTo(EntryTypeValue, context);
                    if (asEntryType === undefined) {
                        throw new LookupEvaluationError(`Expected an entry type but got ${value.constructor.name}`);
                    }
                    entryTypes.add(asEntryType.id);
                }
            } else {
                entryTypes.add(entryTypesValue.id);
            }

            const newQuery = C`
                ${iterable.cypherQuery}
                MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
                WHERE entryType.id IN ${Array.from(entryTypes)}
                WITH entry, annotations
            `;

            iterable = new LazyEntrySetValue(context, newQuery, {
                annotations: iterable.annotations,
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            });
        }

        return iterable;
    }
}
