/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { ParagraphNode } from "neolace-sdk/types/markdown-mdt-ast";
import 'next'; // Required for fetch() to work so test suite loads. https://github.com/vercel/next.js/discussions/13678#discussioncomment-22383

import { EscapeMode, ExtendedTextNode, parseMdtStringToSlateDoc, slateDocToStringValue } from "./slate";

describe("markdown round-trip", () => {

    const verifyInline = (original: string) => {
        const roundTrip = slateDocToStringValue(parseMdtStringToSlateDoc(original, true), EscapeMode.MDT);
        expect(roundTrip).toStrictEqual(original);
    }
    /** If the round-trip of our WYSWIYG editor changes the formatting but the parsed markdown value is still the same. */
    const verifyInlineWithFormattingChanges = (original: string) => {
        const parsedOriginal = parseMdtStringToSlateDoc(original, true);
        const roundTrip = slateDocToStringValue(parsedOriginal, EscapeMode.MDT);
        const parsedRT = parseMdtStringToSlateDoc(roundTrip, true)
        expect(parsedRT).toStrictEqual(parsedOriginal);
    }

    it("leaves plain text unmodified", () => {
        verifyInline("foobar");
        verifyInline("Hello, \\*Bob\\*.");
    });

    it("can do basic bold and italics formatting", () => {
        verifyInline("This sentence contains **bold** and *italics*.");
        verifyInline("**Wholly bold**");
        verifyInline("*Wholly italics*");
        verifyInlineWithFormattingChanges("_Alternate Italics_");
        verifyInlineWithFormattingChanges("__Alternate Bold__");
    });

    // it("can do complicated bold and italics formatting", () => {
    //     // This is the way to write: "A rechargeable battery" with overlapping formatting,
    //     // where "rechargeable bat" is bold and "able battery" is italic:
    //     verifyInline("A **recharge*able bat***_tery_.");
    // });

    it("nesting of marks", () => {
        verifyInline("***super*cali**");
        verifyInline("**^super^cali**");
        verifyInline("**super^cali^**");
        verifyInline("**bold text `with code`**");
        verifyInline("**bold text [with link](/foo)**");
        verifyInline("**partial**[**bold** not bold](/foo)");
        verifyInline("**This is bold *and this is both***");
        verifyInline(`The **total area** of Canada is **9,984,670 km^2^**`);
    });

    it("can escape spaces in superscript/subscript", () => {
        verifyInline("blah blah^Oh\\ really?^");
        verifyInline("blah blah~Oh\\ really?~");
    });
});

describe("Conversion of slate doc to markdown", () => {

    const checkConversion = (original: ParagraphNode["children"], expectedMarkdown: string) => {
        const actualMarkdown = slateDocToStringValue(original, EscapeMode.MDT);
        expect(actualMarkdown).toStrictEqual(expectedMarkdown);
        // And also make sure that our markdown parser + slate conversion again won't undo any of that:
        const roundTrip = slateDocToStringValue(parseMdtStringToSlateDoc(actualMarkdown, true), EscapeMode.MDT);
        expect(roundTrip).toStrictEqual(expectedMarkdown);
    }
    const text = (text: string, attrs: Omit<ExtendedTextNode, "type"|"text"> = {}): ExtendedTextNode => ({ type: "text", text, ...attrs });

    it("leaves plain text unmodified", () => {
        checkConversion([text("foobar")], "foobar");
    });

    it("escapes markdown characters", () => {
        checkConversion([text("hello, *Bob*!")], "hello, \\*Bob\\*!");
        checkConversion(
            [text("> hello, *Bob*! The ^best^ __way__ forward is through!")],
            "\\> hello, \\*Bob\\*! The \\^best\\^ \\_\\_way\\_\\_ forward is through!",
        );
    });

    it("converts marks to markdown symbols correctly", () => {
        checkConversion([text("This has a "), text("bold", {strong: true}), text(" word.")], "This has a **bold** word.");
        // In markdown, the opening marks like "**" can't come before a whitespace, nor can the closing marks come after whitespace.
        // So if the user makes what would render as "This has a** bold **word", we have to use "This has a **bold** word" instead.
        checkConversion([text("This has a"), text(" bold ", {strong: true}), text("word.")], "This has a **bold** word.");
        checkConversion([text("This has a "), text("bold ", {strong: true}), text("word.")], "This has a **bold** word.");
    });
});
