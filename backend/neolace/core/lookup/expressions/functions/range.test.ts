import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { LookupEvaluationError } from "../../errors.ts";
import * as V from "../../values.ts";
import { RangeValue } from "../../values.ts";

const Int = (v: number) => new V.IntegerValue(v);
const Qty = (...args: ConstructorParameters<typeof V.QuantityValue>) => new V.QuantityValue(...args);

group("range.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It gives an error with incompatible values`, async () => {
        await assertRejects(
            () => context.evaluateExprConcrete(`range([true, 1])`),
            LookupEvaluationError,
            `Comparing IntegerValue with BooleanValue is not supported.`,
        );

        await assertRejects(
            () => context.evaluateExprConcrete(`range(["five", 7])`),
            LookupEvaluationError,
            `Comparing IntegerValue with StringValue is not supported.`,
        );
    });

    group("It gives the range of values found", async () => {
        const check = (expr: string, min: V.LookupValue, max: V.LookupValue) => {
            expr = `range(${expr})`;
            test(expr, async () => {
                assertEquals(
                    await context.evaluateExprConcrete(expr),
                    new RangeValue(min, max),
                );
            });
        };

        check(`[1, 2, 3]`, Int(1), Int(3));
        check(`[0, -30, 17, 5, -1, 6]`, Int(-30), Int(17));
        // Mix quantities and integers:
        check(`[3, 15, -2.0, 12.0]`, Qty(-2), Int(15));

        check(`[5 [V], 30 [V], 5 [V], 18 [V]]`, Qty(5, "V"), Qty(30, "V"));
    });

    group("It gives the range of values including other range values", async () => {
        const check = (expr: string, min: V.LookupValue, max: V.LookupValue) => {
            expr = `range(${expr})`;
            test(expr, async () => {
                assertEquals(
                    await context.evaluateExprConcrete(expr),
                    new RangeValue(min, max),
                );
            });
        };

        check(`[range([3, 4]), range([1, 2]), range([-3, -4])]`, Int(-4), Int(4));
    });
});
