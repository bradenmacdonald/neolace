import { createToken, Lexer } from "neolace/deps/chevrotain.ts";

/** The name of a function or variable */
export const Identifier = createToken({ name: "Identifier", pattern: /[A-Za-z_][A-Za-z0-9_]*/ });

// Literal values:
// Note the 'longer_alt' is used so that variables starting with keywords like 'thisOrThat' will be considered
// identifiers, not [Keyword 'this' + Identifier 'OrThat']
export const True = createToken({ name: "True", pattern: /true/, longer_alt: Identifier });
export const False = createToken({ name: "False", pattern: /false/, longer_alt: Identifier });
export const Null = createToken({ name: "Null", pattern: /null/, longer_alt: Identifier });
export const This = createToken({ name: "This", pattern: /this/, longer_alt: Identifier });
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^\\"]|\\(?:[nt"\\/]|u[0-9a-fA-F]{4}))*"/,
});
export const IntegerLiteral = createToken({ name: "IntegerLiteral", pattern: /-?(0|[1-9]\d*)/ });
export const FloatLiteral = createToken({ name: "FloatLiteral", pattern: /-?((0|[1-9]\d*)?\.\d+)/ });

// Syntax:
export const Comma = createToken({ name: "Comma", pattern: /,/, label: "," });
export const Dot = createToken({ name: "Dot", pattern: /\./, label: "." });
export const LSquare = createToken({ name: "LSquare", pattern: /\[/, label: "[" });
export const RSquare = createToken({ name: "RSquare", pattern: /]/, label: "]" });
export const LParen = createToken({ name: "LParen", pattern: /\(/, label: "(" });
export const RParen = createToken({ name: "RParen", pattern: /\)/, label: ")" });
export const Equals = createToken({ name: "Equals", pattern: /=/, label: "=" });
export const Arrow = createToken({ name: "Arrow", pattern: /->/, label: "->" });
export const FwdSlash = createToken({ name: "FwdSlash", pattern: /\//, label: "/" });
export const Percent = createToken({ name: "Percent", pattern: /%/, label: "%" });
export const Caret = createToken({ name: "Caret", pattern: /\^/, label: "^" });
export const MultiplicationDot = createToken({ name: "MultiplicationDot", pattern: /⋅/, label: "⋅" }); // Used in Quantity units

// Note: see https://github.com/chevrotain/chevrotain/blob/master/examples/grammars/calculator/calculator_embedded_actions.js
// for an example when we add +, *, and /

export const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });

export const lookupTokens = [
    // The order of these tokens is important. The _first_ to match is always used, not the longest.
    WhiteSpace, // Whitespace is very common so placing it first improves performance
    Comma,
    Dot,
    LParen,
    RParen,
    Equals,
    This,
    LSquare,
    RSquare,
    True,
    False,
    Null,
    StringLiteral,
    FloatLiteral,
    IntegerLiteral,
    Arrow,
    FwdSlash,
    Caret,
    Percent,
    MultiplicationDot,
    // All simple literals must come before Identifiers, so 'true' is a literal not a variable/function.
    Identifier,
];

export const lookupLexer = new Lexer(lookupTokens, { ensureOptimizations: true });
