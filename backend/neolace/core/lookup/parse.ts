import { VNID } from "neolace/deps/vertex-framework.ts";
import { LookupParseError } from "./errors.ts";
import { LookupExpression } from "./expressions/base.ts";
import { List, LiteralExpression, This } from "./expressions.ts";
import * as V from "./values.ts";
import { type LookupFunctionClass } from "./expressions/functions/base.ts";
import { builtInLookupFunctions } from "./expressions/functions/all-functions.ts";

/**
 * Given a lookup expression as a string like
 *     this.andAncestors()
 * Parse it and return it as a LookupExpression object:
 *     new AndAncestors(new This());
 */
export function parseLookupString(lookup: string, withExtraFunctions: LookupFunctionClass[] = []): LookupExpression {
    // To save time and make development faster, we are cheating with a working but very fake parser.
    // In the future this function should be replaced with a proper parser built using https://chevrotain.io/

    lookup = lookup.trim();

    if (lookup === "null") return new LiteralExpression(new V.NullValue());
    if (lookup === "this") return new This();

    const recursiveParse = (otherLookup: string) => parseLookupString(otherLookup, withExtraFunctions);

    const otherTemplates: [RegExp, (match: RegExpMatchArray) => LookupExpression][] = [
        // "foo" (String literal)
        [/^"(.*)"$/, (_m) => new LiteralExpression(new V.StringValue(JSON.parse(lookup)))],
        // 123 (Integer literal, supports bigints)
        [/^\d+$/, (_m) => new LiteralExpression(new V.IntegerValue(BigInt(lookup)))],
        // [[/entry/_6FisU5zxXg5LcDz4Kb3Wmd]] (Entry literal)
        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]$/, (m) => new LiteralExpression(new V.EntryValue(VNID(m[1])))],
        // [[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]] (Property literal)
        [/^\[\[\/prop\/(_[0-9A-Za-z]{1,22})\]\]$/, (m) => new LiteralExpression(new V.PropertyValue(VNID(m[1])))],

        // something.function()
        [
            /^(.+)\.([A-za-z0-9_]+)\([ \t]*\)$/,
            (m) => {
                const something = m[1];
                const functionName = m[2];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something));
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // function(something)
        [
            /^([A-za-z0-9_]+)\((.+)\)$/,
            (m) => {
                const something = m[2];
                const functionName = m[1];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something));
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // function()
        [
            /^([A-za-z0-9_]+)\([ \t]*\)$/,
            (m) => {
                const functionName = m[1];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs();
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // something.function(arg1=arg1Value)
        [
            /^(.+)\.([A-za-z0-9_]+)\([ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const something = m[1];
                const functionName = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // function(something, arg1=arg1Value)
        [
            /^([A-za-z0-9_]+)\([ \t]*(.+),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const functionName = m[1];
                const something = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // something.function(arg1=arg1Value, arg2=arg2value)
        [
            /^(.+)\.([A-za-z0-9_]+)\([ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const something = m[1];
                const functionName = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const arg2 = m[5];
                const arg2Value = m[6];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                        [arg2]: recursiveParse(arg2Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // function(something, arg1=arg1Value, arg2=arg2value)
        [
            /^([A-za-z0-9_]+)\([ \t]*(.+),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const functionName = m[1];
                const something = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const arg2 = m[5];
                const arg2Value = m[6];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                        [arg2]: recursiveParse(arg2Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // something.function(arg1=arg1Value, arg2=arg2value, arg3=arg3value)
        [
            /^(.+)\.([A-za-z0-9_]+)\([ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const something = m[1];
                const functionName = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const arg2 = m[5];
                const arg2Value = m[6];
                const arg3 = m[7];
                const arg3Value = m[8];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                        [arg2]: recursiveParse(arg2Value),
                        [arg3]: recursiveParse(arg3Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],

        // function(something, arg1=arg1Value, arg2=arg2value, arg3=arg3value)
        [
            /^([A-za-z0-9_]+)\([ \t]*(.+),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*),[ \t]*([A-za-z0-9_]+)[ \t]*=(.*)\)$/,
            (m) => {
                const functionName = m[1];
                const something = m[2];
                const arg1 = m[3];
                const arg1Value = m[4];
                const arg2 = m[5];
                const arg2Value = m[6];
                const arg3 = m[7];
                const arg3Value = m[8];
                const allFunctions = builtInLookupFunctions.concat(withExtraFunctions);
                const matchedFunction = allFunctions.find((fn) => fn.functionName === functionName);
                if (matchedFunction) {
                    return matchedFunction.constructWithArgs(recursiveParse(something), {
                        [arg1]: recursiveParse(arg1Value),
                        [arg2]: recursiveParse(arg2Value),
                        [arg3]: recursiveParse(arg3Value),
                    });
                } else {
                    throw new LookupParseError(`Unknown function: ${functionName}()`);
                }
            },
        ],
    ];

    for (const [re, fn] of otherTemplates) {
        const matchResult = lookup.match(re);
        if (matchResult) {
            try {
                return fn(matchResult);
            } catch (err) {
                if (err instanceof LookupParseError) {
                    // console.error(`Failed to parse: ${err}`);
                    continue;
                } else if (err instanceof SyntaxError) {
                    // This is triggered by the JSON parser that we use to parse string values;
                    continue;
                } else {
                    throw err;
                }
            }
        }
    }

    if (lookup[0] === "[" && lookup[lookup.length - 1] === "]") {
        // It's a list:
        if (lookup.length === 2) {
            return new List([]);
        }
        const parts = lookup.substring(1, lookup.length - 1).split(",").map((part) => part.trim());
        return new List(parts.map((part) => recursiveParse(part)));
    }

    throw new LookupParseError(`Unable to parse the lookup expression "${lookup}"`);
}
