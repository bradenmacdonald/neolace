/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupExpression } from "./base.ts";
import { EntryValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

/**
 * this: gets a reference to the "current entry", if there is one.
 */
export class This extends LookupExpression {
    public async getValue(context: LookupContext) {
        if (!context.entryId) {
            throw new LookupEvaluationError(`The keyword "this" only works in the context of a specific entry.`);
        }
        return new EntryValue(context.entryId);
    }

    public toString(): string {
        return "this";
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(this);
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        fn(this);
    }
}
