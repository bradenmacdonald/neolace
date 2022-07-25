import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { LookupEvaluationError } from "../../errors.ts";
import * as V from "../../values.ts";

group("annotate.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, entryId: defaultData.entries.ponderosaPine.id });

    test(`x.annotate() returns an annotated value with no annotations`, async () => {
        const result = await context.evaluateExprConcrete(`"hello".annotate()`);
        assertInstanceOf(result, V.AnnotatedValue);
        assertInstanceOf(result.value, V.StringValue);
        assertEquals(result.annotations, {});
        assertEquals(result.value.value, "hello");
    });

    test(`x.annotate(foo="bar") returns an annotated value`, async () => {
        const result = await context.evaluateExprConcrete(`123.annotate(foo="bar")`);
        assertInstanceOf(result, V.AnnotatedValue);
        assertInstanceOf(result.value, V.IntegerValue);
        assertEquals(result.value.value, 123n);
        assertEquals(result.annotations, { "foo": new V.StringValue("bar") });
    });

    test(`x.annotate(foo="bar", bip="bop") returns a value with two annotations`, async () => {
        const result = await context.evaluateExprConcrete(`123.annotate(foo="bar", bip="bop")`);
        assertInstanceOf(result, V.AnnotatedValue);
        assertInstanceOf(result.value, V.IntegerValue);
        assertEquals(result.value.value, 123n);
        assertEquals(result.annotations, { "foo": new V.StringValue("bar"), "bip": new V.StringValue("bop") });
    });

    test(`.annotate(a=1, b=1).annotate(a=2, c=2) returns a value annotated with a=2, b=1, c=2`, async () => {
        const result = await context.evaluateExprConcrete(`123.annotate(a=1, b=1).annotate(a=2, c=2)`);
        assertInstanceOf(result, V.AnnotatedValue);
        assertInstanceOf(result.value, V.IntegerValue);
        assertEquals(result.value.value, 123n);
        assertEquals(result.annotations, {
            "a": new V.IntegerValue(2),
            "b": new V.IntegerValue(1),
            "c": new V.IntegerValue(2),
        });
    });

    test(`.annotate() doesn't allow reserved keywords "key", "value", "id", or "type"`, async () => {
        await assertRejects(
            () => context.evaluateExprConcrete(`123.annotate(key="test")`),
            LookupEvaluationError,
            `annotate() cannot create an annotation called "key" as that's a reserved keyword.`,
        );
        await assertRejects(
            () => context.evaluateExprConcrete(`123.annotate(value="test")`),
            LookupEvaluationError,
            `annotate() cannot create an annotation called "value" as that's a reserved keyword.`,
        );
        await assertRejects(
            () => context.evaluateExprConcrete(`123.annotate(id="test")`),
            LookupEvaluationError,
            `annotate() cannot create an annotation called "id" as that's a reserved keyword.`,
        );
        await assertRejects(
            () => context.evaluateExprConcrete(`123.annotate(type="test")`),
            LookupEvaluationError,
            `annotate() cannot create an annotation called "type" as that's a reserved keyword.`,
        );
    });
});
