import { assertEquals, doc, heading } from "./markdown-mdt-test-helpers.ts";
import { tokenizeMDT } from "./markdown-mdt.ts";

Deno.test("MDT - heading IDs", async (t) => {
    await t.step("It gives headings IDs", () => {
        const tree = tokenizeMDT(`# A Heading`);
        assertEquals(
            tree,
            doc(
                heading({
                    text: "A Heading",
                    slugId: "a-heading",
                }),
            ),
        );
    });

    await t.step("It gives unique IDs to duplicate headings", () => {
        const tree = tokenizeMDT(`# Twin Heading\n\n# Twin Heading\n\n## Twin Heading`);
        assertEquals(
            tree,
            doc(
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
            ),
        );
    });
});
