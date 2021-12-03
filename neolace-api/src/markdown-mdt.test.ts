import { assertEquals } from "https://deno.land/std@0.116.0/testing/asserts.ts";
import { AnyInlineNode, InlineNode, TopLevelNode } from "./markdown-mdt-ast.ts";
import {
    tokenizeInlineMDT,
    tokenizeMDT,
    renderInlineToPlainText,
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
function text(content: string): AnyInlineNode {
    return {type: "text", content};
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
    return {type: "lookup_inline", content};
}
/** Helper method to generate a lookup block node, in the parsed Markdown tree */
function lookupBlock(content: string): TopLevelNode {
    return {type: "lookup_block", content, block: true};
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// Tests

Deno.test("MDT - renderInlineToPlainText() strips markdown formatting out", () => {
    const mdtInlineToText = (text: string) => renderInlineToPlainText(tokenizeInlineMDT(text));
    assertEquals(mdtInlineToText("Some text"), "Some text");
    assertEquals(mdtInlineToText("Some **bold** text"), "Some bold text");
    assertEquals(mdtInlineToText("Some [linked](https://www.technotes.org) text"), "Some linked text");
});

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
        tokenizeInlineMDT(`H<sub>2</sub>O`),
        inline(
            text("H"),
            {type: "sub", children: [text("2")]},
            text("O"),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(`E = mc<sup>2</sup>`),
        inline(
            text("E = mc"),
            {type: "sup", children: [text("2")]},
        ),
    );

    // Mismatched tags don't get parsed
    assertEquals(
        tokenizeInlineMDT(`These are <sub>mismatched</sup>`),
        inline(
            text("These are <sub>mismatched</sup>"),
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
