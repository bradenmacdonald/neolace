/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupExpression } from "../base.ts";
import { DatePartialValue, DateValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * date("YYYY-MM-DD" or "YYYY" or "YYYY-MM" or "MM-DD" or "--MM-DD" or "MM" or "--MM"): parse a string into a date value
 */
export class DateExpression extends LookupFunctionOneArg {
    static functionName = "date";
    /** An expression that evaluates to a string, giving the date */
    public get stringDateArg(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext) {
        const strValueObj = await this.stringDateArg.getValueAs(StringValue, context);
        const strValue = strValueObj.value;
        const format = strValue.replaceAll(/N/g, "x").replaceAll(/\d/g, "N");

        const stdErrorMessage = "Date values should be in the format YYYY-MM-DD (or YYYY, YYYY-MM, MM-DD, or MM).";

        if (format === "NNNN-NN-NN") { // normal date format: "YYYY-MM-DD"
            return this.parseToDate(strValue);
        } else if (format === "NNNNNNNN") {
            // This is a string like "YYYYMMDD". It's supported but discouraged in favor of YYYY-MM-DD
            return this.parseToDate(
                strValue.substring(0, 4) + "-" + strValue.substring(4, 6) + "-" + strValue.substring(6, 8),
            );
        } else if (format === "NNNN") { // "YYYY"
            return new DatePartialValue({ year: Number(strValue) });
        } else if (format === "NNNN-NN") { // "YYYY-MM"
            const year = parseInt(strValue.substring(0, 4), 10);
            const month = parseInt(strValue.substring(5, 7), 10);
            return new DatePartialValue({ year, month });
        } else if (format === "NN-NN") { // "MM-DD"
            const month = parseInt(strValue.substring(0, 2), 10);
            const day = parseInt(strValue.substring(3, 5), 10);
            return new DatePartialValue({ month, day });
        } else if (format === "--NN-NN") { // "--MM-DD"
            // We don't like this format but it's defined in a previous ISO 8601 standard.
            const month = parseInt(strValue.substring(2, 4), 10);
            const day = parseInt(strValue.substring(5, 7), 10);
            return new DatePartialValue({ month, day });
        } else if (format === "NN") { // "MM"
            const month = parseInt(strValue.substring(0, 2), 10);
            return new DatePartialValue({ month });
        } else if (format === "--NN") { // "--MM"
            // We don't like this format but it's defined in a previous ISO 8601 standard.
            const month = parseInt(strValue.substring(2, 4), 10);
            return new DatePartialValue({ month });
        } else {
            throw new LookupEvaluationError(stdErrorMessage);
        }
    }

    /** Given a string in exactly the format "YYYY-MM-DD", parse it to a Datevalue */
    protected parseToDate(strValue: string): DateValue {
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

        if (strValue !== newDateValue.asIsoString()) {
            // This is an invalid date like February 30, which has rolled over into March
            throw new LookupEvaluationError("Invalid date.");
        }

        return newDateValue;
    }
}
