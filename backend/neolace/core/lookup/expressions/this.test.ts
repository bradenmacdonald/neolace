import { assertEquals, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { EntryValue } from "../values.ts";
import { This } from "./this.ts";
import { LookupEvaluationError } from "../errors.ts";

group(import.meta, () => {
    group("this", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It gives the ID of the current entry in an entry context", async () => {
            const expression = new This();

            const value = await graph.read((tx) =>
                expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n })
            );

            assertEquals(
                value,
                new EntryValue(ponderosaPine.id),
            );
        });

        test("It doesn't return a result outside of an entry context", async () => {
            const expression = new This();

            await assertRejects(
                () => graph.read((tx) => expression.getValue({ tx, siteId, entryId: undefined, defaultPageSize: 10n })),
                LookupEvaluationError,
                `The keyword "this" only works in the context of a specific entry.`,
            );
        });
    });
});
