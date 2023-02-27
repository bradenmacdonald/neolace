import { assertEquals } from "./markdown-mdt-test-helpers.ts";
import {
    escapeText,
    renderInlineToPlainText,
    renderToPlainText,
    tokenizeInlineMDT,
    tokenizeMDT,
} from "./markdown-mdt.ts";

Deno.test("MDT - renderInlineToPlainText() strips markdown formatting out", () => {
    const mdtInlineToText = (text: string) => renderInlineToPlainText(tokenizeInlineMDT(text));
    assertEquals(mdtInlineToText("Some text"), "Some text");
    assertEquals(mdtInlineToText("Some **bold** text"), "Some bold text");
    assertEquals(mdtInlineToText("Some [linked](https://www.technotes.org) text"), "Some linked text");
});

Deno.test("MDT - renderInlineToPlainText() can evaluate lookup expressions", () => {
    const parsed = tokenizeInlineMDT("The answer is {1 + 1}.");
    assertEquals(renderInlineToPlainText(parsed), "The answer is 1 + 1."); // No evaluation by default
    assertEquals(
        renderInlineToPlainText(parsed, { lookupToText: (expr) => expr === "1 + 1" ? "2" : "??" }),
        "The answer is 2.",
    );
});

Deno.test("MDT - renderToPlainText() strips markdown formatting out", () => {
    const mdtInlineToText = (text: string) =>
        renderToPlainText(tokenizeMDT(text), { lookupToText: (_expr) => "computed value" });
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

Deno.test("MDT - escape() can escape text for Markdown", () => {
    assertEquals(escapeText("hello"), "hello");
    assertEquals(escapeText("not **bold** nor *italic*"), "not \\*\\*bold\\*\\* nor \\*italic\\*");
    assertEquals(escapeText("not __bold__ nor _italic_"), "not \\_\\_bold\\_\\_ nor \\_italic\\_");
    assertEquals(escapeText("not ~subscript~ nor ^superscript^"), "not \\~subscript\\~ nor \\^superscript\\^");
    assertEquals(escapeText("# Not a heading"), "\\# Not a heading");
    assertEquals(escapeText("This is [not a link](/foo)"), "This is \\[not a link\\](/foo)");
    // Parentheses don't create links on their own and are relatively common in text so we avoid
    // escaping them.
    assertEquals(escapeText("We don't need to escape (parentheses)"), "We don't need to escape (parentheses)");
    // '#' doesn't need to be escaped if not at start of a line:
    assertEquals(escapeText("He wears #3 on his jersey"), "He wears #3 on his jersey");
    assertEquals(escapeText("* Not a list"), "\\* Not a list");
    assertEquals(escapeText("> Not a blockquote"), "\\> Not a blockquote");
    // '>' doesn't need to be escaped if not at start of a line:
    assertEquals(escapeText("But 4 > 3 is OK to say"), "But 4 > 3 is OK to say");
    assertEquals(
        escapeText("<html> is not escaped but nor will it render as HTML"),
        "<html> is not escaped but nor will it render as HTML",
    );
    assertEquals(
        escapeText("This is { not a lookup } and {neither is this}"),
        "This is \\{ not a lookup \\} and \\{neither is this\\}",
    );
});
