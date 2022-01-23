import { LookupExpression } from "../expression.ts";
import { DateValue, StringValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

/**
 * date("YYYY-MM-DD"): parse a string into a date value
 */
export class DateExpression extends LookupExpression {
    // An expression that evaluates to a string, giving the date
    readonly stringDateArg: LookupExpression;

    constructor(stringDateArg: LookupExpression) {
        super();
        this.stringDateArg = stringDateArg;
    }

    public async getValue(context: LookupContext) {
        const strValueObj = await this.stringDateArg.getValueAs(StringValue, context);
        let strValue = strValueObj.value;

        const stdErrorMessage = "Date values should be in the format YYYY-MM-DD.";

        if (strValue.length === 10) {
            // This is a string like "YYYY-MM-DD"
            if (strValue.charAt(4) !== "-" || strValue.charAt(7) !== "-") {
                throw new LookupEvaluationError(stdErrorMessage);
            }
        } else if (strValue.length === 8) {
            // This is a string like "YYYYMMDD". It's supported but discouraged in favor of YYYY-MM-DD
            if (String(BigInt(strValue)) !== strValue) {
                throw new LookupEvaluationError("Date values should be in the format YYYY-MM-DD or YYYYMMDD");
            }
            strValue = strValue.substring(0, 4) + "-" + strValue.substring(4, 6) + "-" + strValue.substring(6, 8);
        } else {
            throw new LookupEvaluationError(stdErrorMessage);
        }

        // Validate the date
        let parsedDate: Date;
        try {
            // The Date constructor's parsing is messy, but passing an ISO8601 date string with no timezone
            // should always result in a UTC date object
            parsedDate = new Date(strValue);
            if (isNaN(parsedDate.getUTCFullYear())) { // If the date isn't valid, it may not throw an exception but all fields will return NaN
                throw "invalid date";
            }
        } catch {
            throw new LookupEvaluationError(`${strValue} is not a valid date.`);
        }

        // Create a DateValue, which will also validate that the date is valid (e.g. exclude February 30)
        const newDateValue = new DateValue(
            parsedDate.getUTCFullYear(),
            parsedDate.getUTCMonth() + 1,
            parsedDate.getUTCDate(),
        );

        if (strValue !== newDateValue.asIsoString() && strValue !== newDateValue.asIsoString().replace("-", "")) {
            // This is an invalid date like February 30, which has rolled over into March
            throw new LookupEvaluationError("Invalid date.");
        }

        return newDateValue;
    }

    public toString(): string {
        return `date(${this.stringDateArg.toString()})`;
    }
}
