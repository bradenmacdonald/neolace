import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { InlineMarkdownStringValue, NullValue, StringValue } from "../../values.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { Markdown } from "./markdown.ts";
import { LookupExpression } from "../base.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("markdown.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        getGraph().then((graph) =>
            graph.read((tx) =>
                expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n }).then((v) => v.makeConcrete())
            )
        );
    const siteId = defaultData.site.id;

    test(`It can be given a string argument, and returns an InlineMarkdownStringValue`, async () => {
        const stringValue = new StringValue("**markdown**");
        const expression = new Markdown(new LiteralExpression(stringValue));

        assertEquals(await evalExpression(expression), new InlineMarkdownStringValue("**markdown**"));
        assertEquals(expression.toString(), `markdown("**markdown**")`);
    });

    test(`It gives an error with invalid input`, async () => {
        const nullValue = new NullValue();
        const expression = new Markdown(new LiteralExpression(nullValue));

        await assertRejects(
            () => evalExpression(expression),
            LookupEvaluationError,
            `The expression "null" is not of the right type.`,
        );
    });
});
