import { LookupExpression } from "../base.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { This } from "../this.ts";
import { List } from "../list-expr.ts";

/**
 * A lookup expression that is a function, like count(), first(), or if(...)
 *
 * If this base class is used directly, the function does not accept any arguments.
 */
export abstract class LookupFunction extends LookupExpression {
    static get functionName(): string {
        throw new Error("Subclasses must override functionName");
    }
    get functionName(): string {
        return (this.constructor as typeof LookupFunction).functionName;
    }
    static hasFirstArg = false;

    constructor() {
        super();
    }

    public toString(): string {
        return `${this.functionName}()`;
    }
}

/**
 * A lookup expression that is a function, like count() or first(), that takes a single argument.
 *
 * Lookup functions take arguments. The first argument is never named, and can be written like this, where "this" is the
 * first argument:
 *     this.function()
 *     function(this)
 * These two ways of writing the first argument are equivalent.
 */
export abstract class LookupFunctionOneArg extends LookupFunction {
    static hasFirstArg = true;

    constructor(
        protected readonly firstArg: LookupExpression,
        // protected readonly otherArgs?: {[argName: string]: LookupExpression}
    ) {
        super();
        if (firstArg === undefined) {
            throw new LookupEvaluationError(`The function ${this.functionName} requires an argument.`);
        }
    }

    public toString(): string {
        // Decide if we should format the string expression as "arg.function()" or as "function(arg)"
        // The latter is always safe to use, but is less aethestically pleasing and is harder to follow when long chains
        // of expressions are grouped together:
        //     this.ancestors().andRelated().count() -> easy to follow what's happening
        //     count(andRelated(ancestors(this)))    -> arguably harder to follow what's happening
        //
        // Note that if the first argument is something like "1 + 2", we must always use the second (safe) form,
        // i.e. "function(1 + 2)", because returning "1 + 2.function()" would change the meaning / order of operations.
        if (
            this.firstArg instanceof This ||
            this.firstArg instanceof LookupFunction ||
            this.firstArg instanceof List
        ) {
            return `${this.firstArg.toString()}.${this.functionName}()`;
        }
        return `${this.functionName}(${this.firstArg.toString()})`;
    }
}
