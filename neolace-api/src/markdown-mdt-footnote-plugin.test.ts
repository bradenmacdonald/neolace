import { tokenizeInlineMDT, tokenizeMDT } from "./markdown-mdt.ts";
import { assertEquals, inline, inlineText, paragraph, text } from "./markdown-mdt-test-helpers.ts";

Deno.test("MDT - footnotes", async (t) => {
    await t.step("Basic test of footnotes", () => {
        assertEquals(
            tokenizeMDT(
                `
This has an inline footnote^[here is the footnote message].

This says x^2 is 4 when x is two.

This has a string footnote[^ref1].

This mentions the same footnote again[^ref1].

[^ref1]: Here is the block contents of ref1.

    Including a second paragraph.
`,
            ),
            {
                type: "mdt-document",
                children: [
                    paragraph(inline(
                        text("This has an inline footnote"),
                        { type: "footnote_ref", footnoteId: 0, anchorId: "0", referenceText: "[1]" },
                        text("."),
                    )),

                    paragraph(inlineText("This says x^2 is 4 when x is two.")),

                    paragraph(inline(
                        text("This has a string footnote"),
                        { type: "footnote_ref", footnoteId: 1, anchorId: "1", referenceText: "[2]" },
                        text("."),
                    )),

                    paragraph(inline(
                        text("This mentions the same footnote again"),
                        { type: "footnote_ref", footnoteId: 1, anchorId: "1.1", referenceText: "[2]" },
                        text("."),
                    )),
                ],
                footnotes: [
                    {
                        type: "footnote",
                        id: 0,
                        anchors: ["0"],
                        block: true,
                        children: [
                            paragraph(inlineText("here is the footnote message")),
                        ],
                    },
                    {
                        type: "footnote",
                        id: 1,
                        label: "ref1",
                        anchors: ["1", "1.1"],
                        block: true,
                        children: [
                            paragraph(inlineText("Here is the block contents of ref1.")),
                            paragraph(inlineText("Including a second paragraph.")),
                        ],
                    },
                ],
            },
        );
    });

    await t.step("footnotes in an inline context", () => {
        // By default, footnotes in an inline context are converted to a "footnote_inline" node, with the content right there.
        assertEquals(
            tokenizeInlineMDT(`This has an ^[inline footnote] but references[^1] won't work\n\n[^1]: foo.`),
            inline(
                text("This has an "),
                {
                    type: "footnote_inline",
                    children: [
                        text("inline footnote"),
                    ],
                },
                text(" but references[^1] won't work"),
                { type: "softbreak" },
                { type: "softbreak" },
                text("[^1]: foo."),
            ),
        );
    });

    await t.step("footnotes can be collected from an inline context", () => {
        // But, we can explicitly collect footnotes from an inline parse context, e.g. to combine footnotes from the description and the main article text.
        assertEquals(
            tokenizeMDT(
                `This has an ^[inline footnote] but references[^1] won't work\n\n[^1]: foo.`,
                {
                    inline: true,
                    collectFootnotes: true,
                },
            ),
            {
                type: "mdt-document",
                children: [inline(
                    text("This has an "),
                    { type: "footnote_ref", footnoteId: 0, anchorId: "0", referenceText: "[1]" },
                    text(" but references[^1] won't work"),
                    { type: "softbreak" },
                    { type: "softbreak" },
                    text("[^1]: foo."),
                )],
                footnotes: [
                    {
                        type: "footnote",
                        block: true,
                        id: 0,
                        anchors: ["0"],
                        children: [paragraph(inlineText("inline footnote"))],
                    },
                ],
            },
        );
    });
});
