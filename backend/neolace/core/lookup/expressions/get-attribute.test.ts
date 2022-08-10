import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import {
    EntryTypeValue,
    InlineMarkdownStringValue,
    IntegerValue,
    NullValue,
    PropertyValue,
    StringValue,
} from "../values.ts";
import { GetAttribute } from "./get-attribute.ts";
import { Ancestors, First, LiteralExpression, This } from "../expressions.ts";
import { LookupEvaluationError } from "../errors.ts";

group("get-attribute.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    // String

    test(`Attributes of a string can be retrieved: .length`, async () => {
        const expression = new GetAttribute("length", new LiteralExpression(new StringValue("abcdef")));
        const value = await context.evaluateExprConcrete(expression);
        assertEquals(value, new IntegerValue(6));
    });

    // Entry

    test(`Attributes of an entry can be retrieved: .id`, async () => {
        // this.id
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
        // this.friendlyId
        const expression = new GetAttribute("friendlyId", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new StringValue(ponderosaPine.friendlyId));
    });

    test(`Attributes of an entry can be retrieved: .description`, async () => {
        // this.description
        const expression = new GetAttribute("description", new This());
        const value = await context.evaluateExprConcrete(expression, ponderosaPine.id);
        assertEquals(value, new InlineMarkdownStringValue(ponderosaPine.description));
    });

    // Entry Type
    const speciesType = defaultData.schema.entryTypes._ETSPECIES;

    test(`Attributes of an entry type can be retrieved: .id`, async () => {
        // entryType(...).id
        const expression = new GetAttribute("id", new LiteralExpression(new EntryTypeValue(speciesType.id)));
        const value = await context.evaluateExprConcrete(expression);
        assertEquals(value, new StringValue(speciesType.id));
    });

    test(`Attributes of an entry type can be retrieved: .name`, async () => {
        // entryType(...).name
        const expression = new GetAttribute("name", new LiteralExpression(new EntryTypeValue(speciesType.id)));
        const value = await context.evaluateExprConcrete(expression);
        assertEquals(value, new StringValue(speciesType.name));
    });

    // Property
    const sciNameProp = defaultData.schema.properties._propScientificName;

    test(`Attributes of a property can be retrieved: .id`, async () => {
        // entryType(...).id
        const expression = new GetAttribute("id", new LiteralExpression(new PropertyValue(sciNameProp.id)));
        const value = await context.evaluateExprConcrete(expression);
        assertEquals(value, new StringValue(sciNameProp.id));
    });

    test(`Attributes of a property can be retrieved: .name`, async () => {
        // entryType(...).name
        const expression = new GetAttribute("name", new LiteralExpression(new PropertyValue(sciNameProp.id)));
        const value = await context.evaluateExprConcrete(expression);
        assertEquals(value, new StringValue(sciNameProp.name));
    });

    // Annotations

    test(`Annotations can be retrieved: this.ancestors().first().distance`, async () => {
        // this.ancestors().first().distance
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
