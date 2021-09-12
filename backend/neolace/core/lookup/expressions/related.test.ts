import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { AnnotatedEntryValue, NullValue, PageValue, RelationshipTypeValue, StringValue } from "../values.ts";
import { RelatedEntries } from "./related.ts";
import { LookupExpression } from "../expression.ts";
import { This } from "./this.ts";
import { LiteralExpression } from "./literal-expr.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId}).then(v => v.makeConcrete()));

    // A literal expression referencing the "[Plant part] IS A [Plant part]" relationship:
    const partIsAPart = new LiteralExpression(new RelationshipTypeValue(defaultData.schema.relationshipTypes._PARTisPART.id));
    const from = new LiteralExpression(new StringValue("from"));
    const to = new LiteralExpression(new StringValue("to"));

    group("related()", () => {

        test(`By default it returns relationships in any direction`, async () => {
            const expression = new RelatedEntries(new This(), {via: partIsAPart});
            const value = await evalExpression(expression, cone);

            // [seed cone] IS A [cone], and [pollen cone] IS A [cone]:
            assertEquals(value, new PageValue([
                new AnnotatedEntryValue(defaultData.entries.pollenCone.id, {
                    // Should we include the ID of the relationship fact?
                    weight: new NullValue(),
                }),
                new AnnotatedEntryValue(defaultData.entries.seedCone.id, {
                    // Should we include the ID of the relationship fact?
                    weight: new NullValue(),
                }),
            ], {
                pageSize: 50n,
                startedAt: 0n,
                totalCount: 2n,
            }));

            const value2 = await evalExpression(expression, seedCone);
            assertEquals(value2, new PageValue([
                new AnnotatedEntryValue(cone, {weight: new NullValue()}),
            ], {pageSize: 50n, startedAt: 0n, totalCount: 1n}));
        });

        test(`But it can return only "from" relationships when asked to`, async () => {
            const expression = new RelatedEntries(new This(), {via: partIsAPart, direction: from});
            const value = await evalExpression(expression, cone);

            // [cone] IS A _____ (nothing) so this returns nothing:
            assertEquals(value, new PageValue([], {pageSize: 50n, startedAt: 0n, totalCount: 0n}));

            const value2 = await evalExpression(expression, seedCone);
            // [seed cone] IS A [cone]:
            assertEquals(value2, new PageValue([
                new AnnotatedEntryValue(cone, {weight: new NullValue()}),
            ], {pageSize: 50n, startedAt: 0n, totalCount: 1n}));
        });

        test(`And it can return only "to" relationships when asked to`, async () => {
            const expression = new RelatedEntries(new This(), {via: partIsAPart, direction: to});
            const value = await evalExpression(expression, cone);

            // [seed cone, pollen cone] IS A [cone] so this returns nothing:
            assertEquals(value, new PageValue([
                new AnnotatedEntryValue(defaultData.entries.pollenCone.id, {weight: new NullValue()}),
                new AnnotatedEntryValue(defaultData.entries.seedCone.id, {weight: new NullValue()}),
            ], {
                pageSize: 50n,
                startedAt: 0n,
                totalCount: 2n,
            }));

            const value2 = await evalExpression(expression, seedCone);
            assertEquals(value2, new PageValue([], {pageSize: 50n, startedAt: 0n, totalCount: 0n}));
        });

    });
});
