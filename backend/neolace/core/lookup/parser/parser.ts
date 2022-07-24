import { CstNode, CstParser, IToken, ParserMethod } from "neolace/deps/chevrotain.ts";
import { lookupTokens } from "./lexer.ts";
import * as T from "./lexer.ts";
import { LookupParseError } from "../errors.ts";
import { LookupExpression } from "../expressions/base.ts";
import * as E from "../expressions.ts";
import * as V from "../values.ts";
import { LookupFunction, LookupFunctionClass } from "../expressions/functions/base.ts";
import { builtInLookupFunctions } from "../expressions/functions/all-functions.ts";

/**
 * Once our Lexer has converted the input string into a series of Tokens, this parser will validate that it complies
 * with the rules of the Lookup language grammar, and generate a Concrete Syntax Tree representing the parsed
 * expression.
 *
 * Separately, LookupVisitor will convert the result of this parser into actual LookupExpression objects.
 */
class LookupParser extends CstParser {
    // Declare types for our various rules:
    expression!: ParserMethod<[], CstNode>;
    functionCall!: ParserMethod<[], CstNode>;
    dotFunctionCall!: ParserMethod<[], CstNode>;
    list!: ParserMethod<[], CstNode>;
    value!: ParserMethod<[], CstNode>;
    lambda!: ParserMethod<[], CstNode>;

    constructor() {
        super(lookupTokens, {
            recoveryEnabled: true,
        });

        // deno-lint-ignore no-this-alias
        const $ = this;

        $.RULE("expression", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.functionCall) },
                { ALT: () => $.SUBRULE($.list) },
                { ALT: () => $.SUBRULE($.value) },
                { ALT: () => $.SUBRULE($.lambda) },
            ]);
            $.OPTION(() => $.SUBRULE($.dotFunctionCall));
        });

        // A function call like foo(), or foo(x) or foo(x, bar=blah, bar2=blah2)
        $.RULE("functionCall", () => {
            $.CONSUME(T.Identifier, { LABEL: "functionName" });
            $.CONSUME(T.LParen);
            $.OPTION(() => {
                $.SUBRULE($.expression, { LABEL: "firstParameterValue" }); // The first argument to the function. Never named.
                // Additional parameters - always named:
                $.OPTION2(() => {
                    $.CONSUME(T.Comma);
                    $.MANY_SEP({
                        SEP: T.Comma,
                        DEF: () => {
                            $.CONSUME2(T.Identifier, { LABEL: "otherParamName" });
                            $.CONSUME(T.Equals);
                            $.SUBRULE2($.expression, { LABEL: "otherParamValue" });
                        },
                    });
                });
            });
            $.CONSUME(T.RParen);
        });

        // A function call using the alternative syntax, x.foo() or x.foo(bar=blah, bar2=blah2) where x is the first arg
        // We have to define the rule in this somewhat akward way to avoid left recursion.
        $.RULE("dotFunctionCall", () => {
            $.CONSUME(T.Dot);
            $.CONSUME(T.Identifier, { LABEL: "functionName" });
            $.CONSUME(T.LParen);
            $.OPTION(() => {
                // Additional parameters - always named:
                $.MANY_SEP({
                    SEP: T.Comma,
                    DEF: () => {
                        $.CONSUME2(T.Identifier, { LABEL: "otherParamName" });
                        $.CONSUME(T.Equals);
                        $.SUBRULE2($.expression, { LABEL: "otherParamValue" });
                    },
                });
            });
            $.CONSUME(T.RParen);
            $.OPTION3(() => {
                $.SUBRULE($.dotFunctionCall, { LABEL: "chainedFunction" });
            });
        });

        $.RULE("list", () => {
            $.CONSUME(T.LSquare);
            // Instead of using MANY_SEP, we define list this way to support optional trailing commas:
            $.OPTION(() => {
                $.SUBRULE1($.expression); // The first value in the list
                $.MANY(() => {
                    $.CONSUME(T.Comma);
                    $.SUBRULE2($.expression); // Each additional value in the list
                });
                $.OPTION2(() => {
                    $.CONSUME2(T.Comma);
                }); // Optional trailing comma
            });
            $.CONSUME(T.RSquare);
        });

        $.RULE("value", () => {
            $.OR([
                { ALT: () => $.CONSUME(T.StringLiteral) },
                { ALT: () => $.CONSUME(T.IntegerLiteral) },
                { ALT: () => $.CONSUME(T.This) },
                { ALT: () => $.CONSUME(T.True) },
                { ALT: () => $.CONSUME(T.False) },
                { ALT: () => $.CONSUME(T.Null) },
                { ALT: () => $.CONSUME(T.Identifier) }, // A variable by itself, most likely with a lambda expression
            ]);
        });

        $.RULE("lambda", () => {
            $.CONSUME(T.LParen);
            $.CONSUME(T.Identifier, { LABEL: "variableName" });
            $.CONSUME(T.Arrow);
            $.SUBRULE($.expression);
            $.CONSUME(T.RParen);
        });

        // very important to call this after all the rules have been setup.
        // otherwise the parser may not work correctly as it will lack information
        // derived from the self analysis.
        this.performSelfAnalysis();
    }
}

// We always want just a single instance of the parser:
const parser = new LookupParser();

interface VisitorParams {
    extraFunctions?: LookupFunctionClass[];
}

/**
 * Once we have parsed the lookup expression into Chevrotain's CST (Concrete Syntax Tree),
 * this visitor will convert it to actual LookupExpression classes.
 *
 * See https://chevrotain.io/docs/tutorial/step3a_adding_actions_visitor.html for details
 * on how this pattern works with Chevrotain in general.
 */
class LookupVisitor extends parser.getBaseCstVisitorConstructor<VisitorParams, LookupExpression>() {
    constructor() {
        super();
        // The "validateVisitor" method is a helper utility which performs static analysis
        // to detect missing or redundant visitor methods
        this.validateVisitor();
    }

    expression(ctx: {
        list?: CstNode[];
        functionCall?: CstNode[];
        value?: CstNode[];
        dotFunctionCall?: CstNode[];
        lambda?: CstNode[];
    }, params: VisitorParams): LookupExpression {
        // deno-fmt-ignore
        let expr = (
            ctx.value ? this.visit(ctx.value)
            : ctx.functionCall ? this.visit(ctx.functionCall, params)
            : ctx.list ? this.visit(ctx.list, params)
            : ctx.lambda ? this.visit(ctx.lambda, params)
            : undefined
        );
        if (expr === undefined) {
            console.error(`Expression visitor couldn't handle`, ctx);
            throw new Error(`Visitor failed in expression()`);
        }
        if (ctx.dotFunctionCall) {
            // deno-lint-ignore no-explicit-any
            expr = this.dotFunctionCall(ctx.dotFunctionCall[0].children as any, params, expr);
        }
        return expr;
    }

    functionCall(ctx: {
        functionName: (CstNode & IToken)[];
        firstParameterValue?: CstNode[];
        otherParamName?: (CstNode & IToken)[];
        otherParamValue?: CstNode[];
    }, params: VisitorParams): LookupFunction {
        const fn = this.getFunction(ctx.functionName[0].image, params);
        let otherArgs = undefined;
        if (ctx.otherParamName && ctx.otherParamValue) {
            otherArgs = {} as Record<string, LookupExpression>;
            for (let i = 0; ctx.otherParamName[i]; i++) {
                const argName = ctx.otherParamName[i].image;
                otherArgs[argName] = this.visit(ctx.otherParamValue[i], params);
            }
        }
        return fn.constructWithArgs(
            ctx.firstParameterValue ? this.visit(ctx.firstParameterValue) : undefined,
            otherArgs,
        );
    }

    /** The alternate syntax for calling a function with the first argument before a ".". */
    dotFunctionCall(
        ctx: {
            functionName: (CstNode & IToken)[];
            otherParamName?: (CstNode & IToken)[];
            otherParamValue?: CstNode[];
            chainedFunction?: CstNode[];
        },
        params: VisitorParams,
        firstParameterExpr?: LookupExpression,
    ): LookupFunction {
        if (firstParameterExpr === undefined) {
            throw new Error("Cannot visit dotFunctionCall directly - should be called from expression() or itself");
        }
        const fn = this.getFunction(ctx.functionName[0].image, params);
        let otherArgs = undefined;
        if (ctx.otherParamName && ctx.otherParamValue) {
            otherArgs = {} as Record<string, LookupExpression>;
            for (let i = 0; ctx.otherParamName[i]; i++) {
                const argName = ctx.otherParamName[i].image;
                otherArgs[argName] = this.visit(ctx.otherParamValue[i], params);
            }
        }
        let expr = fn.constructWithArgs(firstParameterExpr, otherArgs);
        if (ctx.chainedFunction) {
            // deno-lint-ignore no-explicit-any
            expr = this.dotFunctionCall(ctx.chainedFunction[0].children as any, params, expr);
        }
        return expr;
    }

    list(ctx: { expression?: CstNode[] }, params: VisitorParams): E.List {
        // ctx.expression contains each item in the list, if there are any.
        return new E.List((ctx.expression ?? []).map((item) => this.visit(item, params)));
    }

    value(ctx: {
        StringLiteral?: (CstNode & IToken)[];
        IntegerLiteral?: (CstNode & IToken)[];
        This?: CstNode[];
        True?: CstNode[];
        False?: CstNode[];
        Null?: CstNode[];
        Identifier?: (CstNode & IToken)[];
    }): LookupExpression {
        if (ctx.StringLiteral) {
            /** The original unescaped text for this string, including the outer "quotes": */
            const image = ctx.StringLiteral[0].image;
            const value = JSON.parse(image); // This will handle escapes for us and be the most performant parser.
            return new E.LiteralExpression(new V.StringValue(value));
        }
        if (ctx.IntegerLiteral) return new E.LiteralExpression(new V.IntegerValue(BigInt(ctx.IntegerLiteral[0].image)));
        if (ctx.This) return new E.This();
        if (ctx.True) return new E.LiteralExpression(new V.BooleanValue(true));
        if (ctx.False) return new E.LiteralExpression(new V.BooleanValue(false));
        if (ctx.Null) return new E.LiteralExpression(new V.NullValue());
        if (ctx.Identifier) return new E.Variable(ctx.Identifier[0].image);
        console.error(`Value visitor couldn't handle`, ctx);
        throw new Error(`Visitor failed in value()`);
    }

    lambda(ctx: {
        variableName: (CstNode & IToken)[];
        expression: CstNode[];
    }, params: VisitorParams): E.Lambda {
        return new E.Lambda(ctx.variableName[0].image, this.visit(ctx.expression, params));
    }

    /** Given a function name like "count", return the class that implements it (e.g. Count) */
    protected getFunction(name: string, params: VisitorParams): LookupFunctionClass {
        const builtIn = builtInLookupFunctions.find((f) => f.functionName === name);
        if (builtIn) {
            return builtIn;
        }
        if (params.extraFunctions) {
            const pluginFn = params.extraFunctions.find((f) => f.functionName === name);
            if (pluginFn) {
                return pluginFn;
            }
        }
        throw new LookupParseError(`Unknown function: ${name}()`);
    }
}
const visitor = new LookupVisitor();

/**
 * Parse a lookup expression.
 *
 * Given a lookup expression as a string like
 *     "this.andAncestors()"
 * This function will parse it and return it as a LookupExpression object:
 *     new AndAncestors(new This());
 *
 * You should generally not use this directly, but rather use LookupContext.parseLookupString() or
 * parseLookupString.evaluateExpr() since those will load any lookup function plugins that are enabled for the specific
 * site before calling this method to do the parsing. You can use this directly in tests, however, as long as the tests
 * don't rely on any plugins.
 */
export function parseLookupString(
    lookupExpression: string,
    extraFunctions: LookupFunctionClass[] = [],
): LookupExpression {
    const lexingResult = T.lookupLexer.tokenize(lookupExpression);
    if (lexingResult.errors.length > 0) {
        throw new LookupParseError(lexingResult.errors[0].message);
    }
    parser.input = lexingResult.tokens; // Assigning to this will reset the parser's inernal state.
    const cst = parser.expression();
    if (parser.errors.length > 0) {
        throw new LookupParseError(parser.errors[0].message);
    }
    const expression = visitor.visit(cst, {
        extraFunctions,
    });
    return expression;
}
