import * as allExpressions from "../../expressions.ts";
import { LookupFunction, LookupFunctionClass } from "./base.ts";

export const builtInLookupFunctions = Object.values(allExpressions).filter((expr) =>
    expr.prototype instanceof LookupFunction
) as unknown as LookupFunctionClass[];
