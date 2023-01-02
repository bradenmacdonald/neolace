import { LookupValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunction } from "./base.ts";
import { AllEntriesFilterableValue } from "../../values/AllEntriesValue.ts";

/**
 * allEntries(): Return all entries on the current site [that the user has permission to see].
 *
 * Typically this would be used along with .filter() to get a subset of the entries.
 */
export class AllEntries extends LookupFunction {
    static functionName = "allEntries";

    public async getValue(context: LookupContext): Promise<LookupValue> {
        // We put most of the logic for "retrieving all entries" into this special AllEntriesFilterableValue. That way
        // when this function is used together with .filter(), we can generate a _much_ more optimized cypher query
        // than if we separately retrieve all entries and then later filter it down based on entry type.
        return await AllEntriesFilterableValue.create(context, {
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
        });
    }
}
