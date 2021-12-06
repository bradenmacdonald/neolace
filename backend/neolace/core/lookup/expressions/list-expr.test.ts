import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { IntegerValue, PageValue, NullValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { List } from "./list-expr.ts";
import { LookupExpression } from "../expression.ts";
import { Count } from "./count.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId}).then(v => v.makeConcrete()));
    const siteId = defaultData.site.id;

    const Int = (x: number) => new LiteralExpression(new IntegerValue(x));

    group("LiteralExpression", () => {

        test(`An empty list`, async () => {
            const expression = new List([]);
            const value = PageValue.from([], 10n);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), "[]");
        });

        test(`It can hold two integers`, async () => {
            const expression = new List([Int(15), Int(-30)]);
            const value = PageValue.from([new IntegerValue(15), new IntegerValue(-30)], 10n);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), `[15, -30]`);
        });

        test(`It can be counted`, async () => {
            const expression = new Count(
                new List([ Int(1), Int(2), new LiteralExpression(new NullValue()) ])
            );
            const value = new IntegerValue(3);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), `count([1, 2, null])`);
        });

        // TODO test that this can be evaluated to get the count() without evaluating lazy values that it holds

    });
});
