/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as allExpressions from "../../expressions.ts";
import { LookupFunction, LookupFunctionClass } from "./base.ts";

export const builtInLookupFunctions = Object.values(allExpressions).filter((expr) =>
    expr.prototype instanceof LookupFunction
) as unknown as LookupFunctionClass[];
