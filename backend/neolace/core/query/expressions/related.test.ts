import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { AnnotatedEntryValue, NullValue, PageValue, RelationshipTypeValue } from "../values.ts";
import { RelatedEntries } from "./related.ts";
import { QueryExpression } from "../expression.ts";
import { This } from "./this.ts";
import { LiteralExpression } from "./literal-expr.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const speciesIsGenus = defaultData.schema.relationshipTypes._SisG.id;
    const ponderosaPine = defaultData.entries.ponderosaPine.id;
    const evalExpression = (expr: QueryExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId}).then(v => v.makeConcrete()));

    group("related()", () => {

        test(`It returns directly related entries where the specified relationship exists FROM the given start entry TO the returned entries`, async () => {
            const expression = new RelatedEntries(new This(), {via: new LiteralExpression(new RelationshipTypeValue(speciesIsGenus))});
            const value = await evalExpression(expression, ponderosaPine);

            // [Ponderosa Pine] IS A [genus Pinus]
            assertEquals(value, new PageValue([
                new AnnotatedEntryValue(defaultData.entries.genusPinus.id, {
                    // Should we include the ID of the relationship fact?
                    weight: new NullValue(),
                }),
            ], {
                pageSize: 50n,
                startedAt: 0n,
                totalCount: 1n,
            }));
        });

    });
});
