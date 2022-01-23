import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { IntegerValue } from "../values.ts";
import { Count } from "./count.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupExpression } from "../expression.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        graph.read((tx) => expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n })).then((v) => v.makeConcrete());
    const siteId = defaultData.site.id;

    group("count()", () => {
        test(`It gives an error with non-countable values`, async () => {
            const expression = new Count(new LiteralExpression(new IntegerValue(-30)));

            await assertRejects(
                () => evalExpression(expression),
                LookupEvaluationError,
                `The expression "-30" cannot be counted with count().`,
            );
        });
    });
});
