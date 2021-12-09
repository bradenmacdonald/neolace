import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { IntegerValue, NullValue, StringValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupExpression } from "../expression.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId, defaultPageSize: 10n}).then(v => v.makeConcrete()));

    group("LiteralExpression", () => {

        test(`It can hold an integer value and express it as a literal`, async () => {
            const value = new IntegerValue(-30);
            const expression = new LiteralExpression(value);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), "-30");
        });

        test(`It can hold a string value and express it as a literal`, async () => {
            const value = new StringValue("hello world");
            const expression = new LiteralExpression(value);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), `"hello world"`);
        });

        test(`It can hold a null value and express it as a literal`, async () => {
            const value = new NullValue();
            const expression = new LiteralExpression(value);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), `null`);
        });

        // test(`It gives an error with non-literal values`, async () => {
        //     const value = TODO
        //     const expression = new EntryValue(value);

        //     TODO
        // });

    });
});
