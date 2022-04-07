import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";
import { AnyInlineNode, InlineNode, TopLevelNode } from "./markdown-mdt-ast.ts";
import {
    tokenizeInlineMDT,
    tokenizeMDT,
    renderInlineToPlainText,
    renderToPlainText,
    Node,
    RootNode,
} from "./markdown-mdt.ts";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Helper methods

/** Helper method to generate the root node of a parsed Markdown tree */
function doc(...n: TopLevelNode[]): RootNode {
    return {type: "mdt-document", children: n}
}
/** Helper method to generate a heading node, in the parsed Markdown tree */
function heading(args: {level?: number, children?: Node[], text?: string, slugId?: string} = {}): TopLevelNode {
    if (args.text) {
        args.children = args.children || [];
        args.children.push(inlineText(args.text));
        delete args.text;
    }
    return {type: "heading", block: true, level: 1, children: [], slugId: "", ...args};
}
/** Helper method to generate an inline node, in the parsed Markdown tree */
function inline(...nodes: AnyInlineNode[]): InlineNode {
    return {type: "inline", children: nodes};
}
/** Helper method to generate a text node, in the parsed Markdown tree */
function text(text: string): AnyInlineNode {
    return {type: "text", text};
}
/** Helper method to generate an inline node containing text, in the parsed Markdown tree */
function inlineText(content: string): InlineNode {
    return inline(text(content));
}
/** Helper method to generate a paraph node */
function paragraph(...children: InlineNode[]): TopLevelNode {
    return {type: "paragraph", children, block: true};
}
/** Helper method to generate a lookup node, in the parsed Markdown tree */
function lookup(content: string): AnyInlineNode {
    return {type: "lookup_inline", children: [{type: "text", text: content}]};
}
/** Helper method to generate a lookup block node, in the parsed Markdown tree */
function lookupBlock(content: string): TopLevelNode {
    return {type: "lookup_block", children: [{type: "text", text: content}], block: true};
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Tests

Deno.test("MDT - heading IDs", async (t) => {

    await t.step("It gives headings IDs", () => {
        const tree = tokenizeMDT(`# A Heading`);
        assertEquals(tree, doc(
            heading({
                text: "A Heading",
                slugId: "a-heading",
            }),
        ));
    });

    await t.step("It gives unique IDs to duplicate headings", () => {
        const tree = tokenizeMDT(`# Twin Heading\n\n# Twin Heading\n\n## Twin Heading`);
        assertEquals(tree, doc(
            heading({
                text: "Twin Heading",
                slugId: "twin-heading",
            }),
            heading({
                text: "Twin Heading",
                slugId: "twin-heading-2",
            }),
            heading({
                text: "Twin Heading",
                slugId: "twin-heading-3",
                level: 2,
            }),
        ));
    });
});

Deno.test("Subscript/superscript", () => {

    assertEquals(
        tokenizeInlineMDT(`H~2~O`),
        inline(
            text("H"),
            {type: "sub", children: [text("2")]},
            text("O"),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(`E = mc^2^`),
        inline(
            text("E = mc"),
            {type: "sup", children: [text("2")]},
        ),
    );

    // Mismatched tags don't get parsed
    assertEquals(
        tokenizeInlineMDT(`These are ~mismatched^`),
        inline(
            text("These are ~mismatched^"),
        ),
    );

});

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
        tokenizeInlineMDT(`This is { an inline lookup with "some \\"escaped braces { \\" and quotes that are ignored." }.`),
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
            heading({text: "Heading", slugId: "heading"}),
            lookupBlock("lookup block"),
            paragraph(inlineText("text")),
        ),
    );

    // simple multi-line lookup with indent
    assertEquals(
        tokenizeMDT(`# Heading\n\n{\n    lookup\n    block\n}\n\ntext`),
        doc(
            heading({text: "Heading", slugId: "heading"}),
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
`
        ),
        doc(
            {
                type: "bullet_list",
                block: true,
                children: [
                    {type: "list_item", block: true, children: [inlineText("List Item 1")]},
                    {type: "list_item", block: true, children: [
                        inlineText("List Item 2"),
                        lookupBlock("  lookup in list\n  second lookup line\n"),
                    ]},
                ],
            },
        ),
    );

    // A lookup with text after it on the same line becomes an inline lookup
    assertEquals(
        tokenizeMDT(`# Heading\n\n{lookup expr} text on same line`),
        doc(
            heading({text: "Heading", slugId: "heading"}),
            paragraph(inline(
                lookup("lookup expr"),
                text(" text on same line"),
            )),
        ),
    );
});

Deno.test("MDT - renderInlineToPlainText() strips markdown formatting out", () => {
    const mdtInlineToText = (text: string) => renderInlineToPlainText(tokenizeInlineMDT(text));
    assertEquals(mdtInlineToText("Some text"), "Some text");
    assertEquals(mdtInlineToText("Some **bold** text"), "Some bold text");
    assertEquals(mdtInlineToText("Some [linked](https://www.technotes.org) text"), "Some linked text");
});

Deno.test("MDT - renderInlineToPlainText() can evaluate lookup expressions", () => {
    const parsed = tokenizeInlineMDT("The answer is {1 + 1}.")
    assertEquals(renderInlineToPlainText(parsed), "The answer is 1 + 1."); // No evaluation by default
    assertEquals(
        renderInlineToPlainText(parsed, {lookupToText: (expr) => expr === "1 + 1" ? "2" : "??"}),
        "The answer is 2.",
    );
});

Deno.test("MDT - renderToPlainText() strips markdown formatting out", () => {
    const mdtInlineToText = (text: string) => renderToPlainText(tokenizeMDT(text), {lookupToText: (_expr) => "computed value"});
    assertEquals(
        mdtInlineToText(`
# Heading

Here is some text with a {lookup expression}.

* To **boldly** go
  > where no blockquote has gone before.

{
    lookup block
}`),
        // Should equal:
        "Heading\n\nHere is some text with a computed value.\n\nTo boldly go\n\nwhere no blockquote has gone before.\n\ncomputed value\n\n",
    );
});

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
                        {type: "footnote_ref", footnoteId: 0, anchorId: "0", referenceText: "[1]"},
                        text("."),
                    )),
    
                    paragraph(inlineText("This says x^2 is 4 when x is two.")),
    
                    paragraph(inline(
                        text("This has a string footnote"),
                        {type: "footnote_ref", footnoteId: 1, anchorId: "1", referenceText: "[2]"},
                        text("."),
                    )),
    
                    paragraph(inline(
                        text("This mentions the same footnote again"),
                        {type: "footnote_ref", footnoteId: 1, anchorId: "1.1", referenceText: "[2]"},
                        text("."),
                    )),
                ],
                footnotes: [
                    {type: "footnote", id: 0, anchors: ["0"], block: true, children: [
                        paragraph(inlineText("here is the footnote message")),
                    ]},
                    {type: "footnote", id: 1, label: "ref1", anchors: ["1", "1.1"], block: true, children: [
                        paragraph(inlineText("Here is the block contents of ref1.")),
                        paragraph(inlineText("Including a second paragraph.")),
                    ]},
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
                {type: "footnote_inline", children: [
                    text("inline footnote"),
                ]},
                text(" but references[^1] won't work"),
                {type: "softbreak"},
                {type: "softbreak"},
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
                }
            ),
            {
                type: "mdt-document",
                children: [inline(
                    text("This has an "),
                    {type: "footnote_ref", footnoteId: 0, anchorId: "0", referenceText: "[1]"},
                    text(" but references[^1] won't work"),
                    {type: "softbreak"},
                    {type: "softbreak"},
                    text("[^1]: foo."),
                )],
                footnotes: [
                    {
                        type: "footnote",
                        block: true,
                        id: 0,
                        anchors: ["0"],
                        children: [paragraph(inlineText("inline footnote"))],
                    }
                ],
            },
        );
    });
});
