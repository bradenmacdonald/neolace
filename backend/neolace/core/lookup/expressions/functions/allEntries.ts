import { LookupValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunction } from "./base.ts";
import { AllEntriesFilterableValue } from "../../values/AllEntriesValue.ts";

/**
 * allEntries(): Return all entries on the current site [that the user has permission to see].
 */
export class AllEntries extends LookupFunction {
    static functionName = "allEntries";

    public async getValue(context: LookupContext): Promise<LookupValue> {
        return await AllEntriesFilterableValue.create(context, {
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
        });
    }
}
