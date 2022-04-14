import { tokenizeInlineMDT, tokenizeMDT } from "./markdown-mdt.ts";
import {
    assertEquals,
    doc,
    heading,
    inline,
    inlineText,
    lookup,
    lookupBlock,
    paragraph,
    text,
} from "./markdown-mdt-test-helpers.ts";

Deno.test("MDT - parsing inline lookup expressions", () => {
    assertEquals(
        tokenizeInlineMDT(`This is {an inline lookup}.`),
        inline(
            text("This is "),
            lookup("an inline lookup"),
            text("."),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(`This is { an inline lookup with "some quoted {braces} that are ignored" }.`),
        inline(
            text("This is "),
            lookup(`an inline lookup with "some quoted {braces} that are ignored"`),
            text("."),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(
            `This is { an inline lookup with "some \\"escaped braces { \\" and quotes that are ignored." }.`,
        ),
        inline(
            text("This is "),
            lookup(`an inline lookup with "some \\"escaped braces { \\" and quotes that are ignored."`),
            text("."),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(`This is { an unclosed lookup`),
        inline(
            text("This is { an unclosed lookup"),
        ),
    );
});

Deno.test("MDT - parsing lookup block expressions", () => {
    // Simplest case - a lookup on its own line should not be part of a paragraph/inline but rather should be a block
    assertEquals(
        tokenizeMDT(`# Heading\n\n{lookup block}\n\ntext`),
        doc(
            heading({ text: "Heading", slugId: "heading" }),
            lookupBlock("lookup block"),
            paragraph(inlineText("text")),
        ),
    );

    // simple multi-line lookup with indent
    assertEquals(
        tokenizeMDT(`# Heading\n\n{\n    lookup\n    block\n}\n\ntext`),
        doc(
            heading({ text: "Heading", slugId: "heading" }),
            lookupBlock("    lookup\n    block\n"),
            paragraph(inlineText("text")),
        ),
    );

    // It can be indented and used e.g. as a child of a list item
    assertEquals(
        tokenizeMDT(
            `
* List Item 1
* List Item 2
  {
    lookup in list
    second lookup line
  }
`,
        ),
        doc(
            {
                type: "bullet_list",
                block: true,
                children: [
                    { type: "list_item", block: true, children: [inlineText("List Item 1")] },
                    {
                        type: "list_item",
                        block: true,
                        children: [
                            inlineText("List Item 2"),
                            lookupBlock("  lookup in list\n  second lookup line\n"),
                        ],
                    },
                ],
            },
        ),
    );

    // A lookup with text after it on the same line becomes an inline lookup
    assertEquals(
        tokenizeMDT(`# Heading\n\n{lookup expr} text on same line`),
        doc(
            heading({ text: "Heading", slugId: "heading" }),
            paragraph(inline(
                lookup("lookup expr"),
                text(" text on same line"),
            )),
        ),
    );
});
