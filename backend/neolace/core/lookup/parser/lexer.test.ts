/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { IToken } from "neolace/deps/chevrotain.ts";
import { lookupLexer } from "./lexer.ts";
import * as T from "./lexer.ts";

/** A helper that makes it easier to check the tokens that result from lexing a lookup expression */
const simplifyTokens = (tokens: IToken[]) =>
    tokens.map((t) =>
        t.tokenType.name === "Identifier" || t.tokenType.name === "StringLiteral" ? [t.tokenType, t.image] : t.tokenType
    );

group("lexer.ts", () => {
    // These tests don't use the database at all.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    test("empty list", () => {
        const { tokens, errors } = lookupLexer.tokenize(`[]`);
        assertEquals(errors, []);
        assertEquals(tokens.map((t) => t.tokenType), [
            T.LSquare,
            T.RSquare,
        ]);
    });

    test("string with escapes", () => {
        const { tokens, errors } = lookupLexer.tokenize(`"double \\"quotes\\" can be escaped."`);
        assertEquals(errors, []);
        assertEquals(simplifyTokens(tokens), [
            [T.StringLiteral, `"double \\"quotes\\" can be escaped."`],
        ]);
    });

    test("list of various value types", () => {
        const { tokens, errors } = lookupLexer.tokenize(`[0, -1, 3, "hello", true, false, this, null, someVar, ]`);
        assertEquals(errors, []);
        assertEquals(tokens.map((t) => t.tokenType), [
            T.LSquare,
            T.IntegerLiteral, // 0
            T.Comma,
            T.IntegerLiteral, // -1
            T.Comma,
            T.IntegerLiteral, // 3
            T.Comma,
            T.StringLiteral, // "hello"
            T.Comma,
            T.True,
            T.Comma,
            T.False,
            T.Comma,
            T.This,
            T.Comma,
            T.Null,
            T.Comma,
            T.Identifier, // someVar
            T.Comma,
            T.RSquare,
        ]);
    });

    test("edge case: identifiers that start with keywords", () => {
        // See https://github.com/Chevrotain/chevrotain/blob/376d9fe60/examples/lexer/keywords_vs_identifiers/keywords_vs_identifiers.js
        // for details on this edge case.
        const { tokens, errors } = lookupLexer.tokenize(
            `[true, trueVar, false, falsehood, this, thistory, null, nullOrNot]`,
        );
        assertEquals(errors, []);
        assertEquals(simplifyTokens(tokens), [
            T.LSquare,
            // true / trueVar:
            T.True,
            T.Comma,
            [T.Identifier, "trueVar"],
            T.Comma,
            // false / falsehood:
            T.False,
            T.Comma,
            [T.Identifier, "falsehood"],
            T.Comma,
            // this / thistory:
            T.This,
            T.Comma,
            [T.Identifier, "thistory"],
            T.Comma,
            // null / nullOrNot
            T.Null,
            T.Comma,
            [T.Identifier, "nullOrNot"],
            T.RSquare,
        ]);
    });

    test("complex case", () => {
        const { tokens, errors } = lookupLexer.tokenize(
            `[entry("tc-ec-cell-li"), entry("tc-ec-cell")].map(apply=(e -> e.annotate(detail=e.ancestors().count())))`,
        );
        assertEquals(errors, []);
        assertEquals(simplifyTokens(tokens), [
            T.LSquare, // [
            [T.Identifier, "entry"],
            T.LParen, // (
            [T.StringLiteral, `"tc-ec-cell-li"`],
            T.RParen, // )
            T.Comma, // ,
            [T.Identifier, "entry"],
            T.LParen, // (
            [T.StringLiteral, `"tc-ec-cell"`],
            T.RParen, // )
            T.RSquare, // ]
            T.Dot, // .
            [T.Identifier, "map"],
            T.LParen, // (
            [T.Identifier, "apply"],
            T.Equals, // =
            T.LParen, // (
            [T.Identifier, "e"],
            T.Arrow, // ->
            [T.Identifier, "e"],
            T.Dot, // .
            [T.Identifier, "annotate"],
            T.LParen, // (
            [T.Identifier, "detail"],
            T.Equals, // =
            [T.Identifier, "e"],
            T.Dot, // .
            [T.Identifier, "ancestors"],
            T.LParen, // (
            T.RParen, // )
            T.Dot, // .
            [T.Identifier, "count"],
            T.LParen, // (
            T.RParen, // )
            T.RParen, // )
            T.RParen, // )
            T.RParen, // )
        ]);
    });

    test("quantity values", () => {
        const { tokens, errors } = lookupLexer.tokenize(
            `1500.2 [K kg⋅m/s^2]`,
        );
        assertEquals(errors, []);
        assertEquals(simplifyTokens(tokens), [
            T.FloatLiteral, // 1500.2
            T.LSquare,
            [T.Identifier, "K"],
            [T.Identifier, "kg"],
            T.MultiplicationDot, // ⋅
            [T.Identifier, "m"],
            T.FwdSlash,
            [T.Identifier, "s"],
            T.Caret,
            T.IntegerLiteral, // 2
            T.RSquare, // ]
        ]);
    });
});
