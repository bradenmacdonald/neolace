import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { PropertyValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("prop.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Can look up a property by VNID", async () => {
        assertEquals(
            await context.evaluateExpr(`prop("${defaultData.schema.properties._parentGenus.id}")`),
            new PropertyValue(defaultData.schema.properties._parentGenus.id),
        );
    });

    test("Does not return properties from other sites", async () => {
        const otherSiteContext = new TestLookupContext({ siteId: defaultData.otherSite.id });

        const expr = `prop("${defaultData.schema.properties._parentGenus.id}")`;
        assertEquals(
            await context.evaluateExpr(expr),
            new PropertyValue(defaultData.schema.properties._parentGenus.id),
        );
        await assertRejects(
            () => otherSiteContext.evaluateExpr(expr, undefined),
            LookupEvaluationError,
            "Property not found.",
        );
    });
});
