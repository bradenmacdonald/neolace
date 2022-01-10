import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertRejects, assertEquals, assert } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { DateValue, StringValue } from "../values.ts";
import { DateExpression } from "./date.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupExpression } from "../expression.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId, defaultPageSize: 10n})).then(v => v.makeConcrete());
    const siteId = defaultData.site.id;

    group("date()", () => {

        test(`It can parse dates`, async () => {

            async function checkString(dateStr: string, expected?: string) {
                const expr = new DateExpression(new LiteralExpression(new StringValue(dateStr)));
                const value = await evalExpression(expr);
                assert(value instanceof DateValue);
                assertEquals(value.asIsoString(), expected ?? dateStr);
            }

            // Check some "typical" dates:
            await checkString("2020-01-10");
            await checkString("2020-03-31");
            await checkString("2020-04-01");
            await checkString("20200110", "2020-01-10");
            // Check future dates:
            await checkString("2036-02-29");
            await checkString("2072-02-29");
            // Check past dates:
            await checkString("1969-07-20");
            await checkString("1867-07-01");
        });

        test(`It rejects invalid dates`, async () => {

            async function checkString(dateStr: string, errorStr: string) {
                const expr = new DateExpression(new LiteralExpression(new StringValue(dateStr)));
                await assertRejects(
                    () => evalExpression(expr),
                    LookupEvaluationError,
                    errorStr,
                );
            }

            // These are all invalid dates:
            await checkString("foobar", "Date values should be in the format YYYY-MM-DD.");
            await checkString("", "Date values should be in the format YYYY-MM-DD.");
            await checkString("1234-56-78", "1234-56-78 is not a valid date.");
            await checkString("2020-02-45", "2020-02-45 is not a valid date.");
            await checkString("2070-02-29", "Invalid date.");  // Not a leap year
        });

    });
});
