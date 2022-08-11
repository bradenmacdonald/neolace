import {
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import * as V from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("link.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    // Using with entries:

    test(`It converts an entry into a markdown link, with the entry name as the text.`, async () => {
        const result = await context.evaluateExprConcrete(
            `entry("${defaultData.entries.ponderosaPine.id}").link()`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(result.value, `[Ponderosa Pine](/entry/${defaultData.entries.ponderosaPine.friendlyId})`);
    });

    test(`It converts an entry into a markdown link, with custom text that's not markdown.`, async () => {
        const result = await context.evaluateExprConcrete(
            `entry("${defaultData.entries.ponderosaPine.id}").link(text="this is [**escaped**](right?)")`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(
            result.value,
            `[this is \\[\\*\\*escaped\\*\\*\\](right?)](/entry/${defaultData.entries.ponderosaPine.friendlyId})`,
        );
    });

    test(`It converts an entry into a markdown link, with custom text that is markdown.`, async () => {
        const result = await context.evaluateExprConcrete(
            `entry("${defaultData.entries.ponderosaPine.id}").link(text=markdown("very **cool**!"))`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(result.value, `[very **cool**!](/entry/${defaultData.entries.ponderosaPine.friendlyId})`);
    });

    // Using with Images:

    const imgEntry = defaultData.entries.imgPonderosaTrunk;

    test(`A Link to an image`, async () => {
        const result = await context.evaluateExprConcrete(
            `entry("${imgEntry.friendlyId}").image().link()`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assert(
            // The exact URL varies so just check the first part:
            result.value.startsWith(
                `[${defaultData.entries.imgPonderosaTrunk.name}](http://localhost:9000/neolace-test-objects/`,
            ),
        );
    });

    // Using with Files:

    // TODO: the default data set doesn't contain any files.

    // Using with URLs:

    test(`A Link with custom URL and custom text`, async () => {
        const result = await context.evaluateExprConcrete(
            `link("https://www.google.com", text="Google")`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(result.value, `[Google](https://www.google.com)`);
    });

    test(`A Link with custom URL and custom text that gets escaped`, async () => {
        const result = await context.evaluateExprConcrete(
            `link("https://www.google.com", text="[Google]")`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(result.value, `[\\[Google\\]](https://www.google.com)`);
    });

    test(`A Link with custom URL only`, async () => {
        const result = await context.evaluateExprConcrete(
            `link("https://www.google.com")`,
        );

        assertInstanceOf(result, V.InlineMarkdownStringValue);
        assertEquals(result.value, `[https://www.google.com](https://www.google.com)`);
    });

    // Other:

    test(`It gives an error message when used with other values`, async () => {
        await assertRejects(
            () => context.evaluateExprConcrete(`link(123)`),
            LookupEvaluationError,
            `The expression "123" is not of the right type.`,
        );
    });
});
