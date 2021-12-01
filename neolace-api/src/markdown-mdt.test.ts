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

});