import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { IntegerValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { QueryExpression } from "../expression.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: QueryExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId})).then(v => v.makeConcrete());
    const siteId = defaultData.site.id;

    group("LiteralExpression", () => {

        test(`It can hold an integer value and express it as a literal`, async () => {
            const value = new IntegerValue(-30);
            const expression = new LiteralExpression(value);

            assertEquals(await evalExpression(expression), value);
            assertEquals(expression.toString(), "-30");
        });

        // test(`It gives an error with non-literal values`, async () => {
        //     const value = TODO
        //     const expression = new EntryValue(value);

        //     TODO
        // });

    });
});
