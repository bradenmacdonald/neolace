import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { IntegerValue, NullValue, PageValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { List } from "./list-expr.ts";
import { LookupExpression } from "./base.ts";
import { Count } from "./functions/count.ts";

group("list-expr.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        getGraph().then((graph) =>
            graph.read((tx) =>
                expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n }).then((v) => v.makeConcrete())
            )
        );
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
                new List([Int(1), Int(2), new LiteralExpression(new NullValue())]),
            );
            const value = new IntegerValue(3);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), `count([1, 2, null])`);
        });

        // TODO test that this can be evaluated to get the count() without evaluating lazy values that it holds
    });
});
