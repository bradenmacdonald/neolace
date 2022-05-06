import { tokenizeInlineMDT } from "./markdown-mdt.ts";
import { assertEquals, inline, text } from "./markdown-mdt-test-helpers.ts";

Deno.test("MDT - Subscript/superscript", () => {
    assertEquals(
        tokenizeInlineMDT(`H~2~O`),
        inline(
            text("H"),
            { type: "sub", children: [text("2")] },
            text("O"),
        ),
    );

    assertEquals(
        tokenizeInlineMDT(`E = mc^2^`),
        inline(
            text("E = mc"),
            { type: "sup", children: [text("2")] },
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
