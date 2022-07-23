import { LookupExpression } from "../base.ts";
import { LookupEvaluationError, LookupParseError } from "../../errors.ts";
import { This } from "../this.ts";
import { List } from "../list-expr.ts";
import { LiteralExpression } from "../../expressions.ts";
import { EntryTypeValue, EntryValue, PropertyValue } from "../../values.ts";

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

    public override toString(): string {
        return `${this.functionName}()`;
    }

    static constructWithArgs(
        this: LookupFunctionClass,
        firstArg?: LookupExpression,
        otherArgs?: { [argName: string]: LookupExpression },
    ): LookupFunction {
        this.functionName; // Accessing this ensures we're not trying to instantiate one of the base abstract classes.
        if (firstArg !== undefined || otherArgs !== undefined) {
            throw new LookupParseError(`The lookup function ${this.functionName}() does not accept any arguments.`);
        }
        return new this();
    }
}

/**
 * This is a type to represent the class of a LookupFunction, as opposed to an instance of one.
 * It is defined this way to avoid warnings about trying to instantiate an abstract class.
 */
export type LookupFunctionClass =
    // deno-lint-ignore no-explicit-any
    & { new (...args: any[]): LookupFunction }
    & Pick<typeof LookupFunction, "functionName" | "constructWithArgs">;

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
    constructor(
        protected readonly firstArg: LookupExpression,
    ) {
        super();
        // Additional runtime check - but this shouldn't happen because of TypeScript type checks:
        if (firstArg === undefined) {
            throw new LookupEvaluationError(`The function ${this.functionName} requires an argument.`);
        }
    }

    public override toString(): string {
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
            this.firstArg instanceof List ||
            this.firstArg instanceof LiteralExpression && (
                    this.firstArg.value instanceof EntryValue ||
                    this.firstArg.value instanceof PropertyValue ||
                    this.firstArg.value instanceof EntryTypeValue
                )
        ) {
            return `${this.firstArg.toString()}.${this.functionName}()`;
        }
        return `${this.functionName}(${this.firstArg.toString()})`;
    }

    static override constructWithArgs(
        this: LookupFunctionClass,
        firstArg?: LookupExpression,
        otherArgs?: { [argName: string]: LookupExpression },
    ): LookupFunction {
        this.functionName; // Accessing this ensures we're not trying to instantiate one of the base abstract classes.
        const numberOfOtherArgs = otherArgs === undefined ? 0 : Object.keys(otherArgs).length;
        if (firstArg === undefined) {
            throw new LookupParseError(
                `The lookup function ${this.functionName}() requires an argument, like: ` +
                    `something.${this.functionName}() or ${this.functionName}(something)`,
            );
        } else if (numberOfOtherArgs > 0) {
            throw new LookupParseError(
                `The lookup function ${this.functionName}() does not accept more than one argument.`,
            );
        }
        return new this(firstArg);
    }
}

/**
 * A lookup expression that is a function which may take more than one argument.
 *
 * Additional arguments, if present, must always be named:
 *     firstArg.function(someParam=someValue, otherParam=otherValue)
 */
export abstract class LookupFunctionWithArgs extends LookupFunctionOneArg {
    constructor(
        firstArg: LookupExpression,
        protected readonly otherArgs: { [argName: string]: LookupExpression },
    ) {
        super(firstArg);
        this.validateArgs();
    }

    /**
     * Validate the arguments provided as this.firstArg and this.otherArgs.
     * This validation is only that correctly named arguments are provided and no unexpected arguments were; it does not
     * actually validate any values, which happens later in getValue().
     *
     * This function should throw LookupParseError if arguments are invalid.
     */
    protected abstract validateArgs(): void;

    /** Helper method that makes implementing validateArgs() easy in most cases. */
    protected requireArgs(requiredArgKeys: string[], other?: { optional: string[] }) {
        const argKeys = new Set(Object.keys(this.otherArgs));
        // Check required args:
        for (const required of requiredArgKeys) {
            if (!argKeys.delete(required)) {
                throw new LookupParseError(`Missing required argument to ${this.functionName}(): ${required}`);
            }
        }
        // Check optional args:
        if (other?.optional) {
            for (const optionalKey of other.optional) {
                argKeys.delete(optionalKey);
            }
        }
        // Any args left?
        if (argKeys.size) {
            const extraArgName = argKeys.values().next().value;
            throw new LookupParseError(`Unexpected argument to ${this.functionName}(): ${extraArgName}`);
        }
    }

    public override toString(): string {
        // First, convert this to a string as if it has no extra arguments:
        const oneArg = super.toString();
        // Get the other arguments that aren't included in the above string:
        const otherArgsAsStrings = Object.entries(this.otherArgs).map(([argName, argExpression]) =>
            `${argName}=${argExpression.toString()}`
        );

        if (oneArg.endsWith("()")) {
            // We need to rewrite "x.foo()" to become "x.foo(arg1=val1, arg2=val2)":
            return oneArg.substring(0, oneArg.length - 1) + otherArgsAsStrings.join(", ") + ")";
        } else if (oneArg.endsWith(")")) {
            // We need to rewrite "foo(x)" to become "foo(x, arg1=val1, arg2=val2)":
            return oneArg.substring(0, oneArg.length - 1) + ", " + otherArgsAsStrings.join(", ") + ")";
        } else {
            throw new Error("LookupFunctionWithArgs: internal error, expected super.toString() to end with ')'");
        }
    }

    static override constructWithArgs(
        this: LookupFunctionClass,
        firstArg?: LookupExpression,
        otherArgs?: { [argName: string]: LookupExpression },
    ): LookupFunction {
        this.functionName; // Accessing this ensures we're not trying to instantiate one of the base abstract classes.
        if (firstArg === undefined) {
            throw new LookupParseError(
                `The lookup function ${this.functionName}() requires an argument, like: ` +
                    `something.${this.functionName}() or ${this.functionName}(something)`,
            );
        }
        return new this(firstArg, otherArgs ?? {});
    }
}
