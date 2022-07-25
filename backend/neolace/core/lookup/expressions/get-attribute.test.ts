import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { InlineMarkdownStringValue, IntegerValue, NullValue, StringValue } from "../values.ts";
import { GetAttribute } from "./get-attribute.ts";
import { Ancestors, First, This } from "../expressions.ts";
import { LookupEvaluationError } from "../errors.ts";

group("get-attribute.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`Attributes of an entry can be retrieved: .id`, async () => {
        // this.name
        const expression = new GetAttribute("id", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new StringValue(ponderosaPine.id));
    });

    test(`Attributes of an entry can be retrieved: .name`, async () => {
        // this.name
        const expression = new GetAttribute("name", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new StringValue(ponderosaPine.name));
    });

    test(`Attributes of an entry can be retrieved: .friendlyId`, async () => {
        // this.name
        const expression = new GetAttribute("friendlyId", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new StringValue(ponderosaPine.friendlyId));
    });

    test(`Attributes of an entry can be retrieved: .description`, async () => {
        // this.name
        const expression = new GetAttribute("description", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new InlineMarkdownStringValue(ponderosaPine.description));
    });

    test(`Annotations can be retrieved: this.ancestors().first().distance`, async () => {
        // this.name
        const expression = new GetAttribute("distance", new First(new Ancestors(new This())));
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new IntegerValue(1));
    });

    test(`Standard annotations return null if they aren't set`, async () => {
        const expression = new GetAttribute("note", new First(new Ancestors(new This())));
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new NullValue());
    });

    test(`Standard annotations give an error if they aren't set`, async () => {
        // This way if users type something like 'this.entryType' instead of 'this.entryType()', they get an error.
        const expression = new GetAttribute("entryType", new First(new Ancestors(new This())));
        await assertRejects(
            () => context.evaluateExprConcrete(expression, ponderosaPine.id),
            LookupEvaluationError,
            "Unknown attribute/annotation: entryType",
        );
    });
});
