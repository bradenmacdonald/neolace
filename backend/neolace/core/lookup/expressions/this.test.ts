/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { EntryValue } from "../values.ts";
import { This } from "./this.ts";
import { LookupEvaluationError } from "../errors.ts";

group("this.ts", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

    test("It gives the ID of the current entry in an entry context", async () => {
        const expression = new This();
        const value = await context.evaluateExpr(expression);

        assertEquals(value, new EntryValue(ponderosaPine.id));
    });

    test("It doesn't return a result outside of an entry context", async () => {
        const expression = new This();
        const noEntryContext = new TestLookupContext({ siteId, entryId: undefined });

        await assertRejects(
            () => noEntryContext.evaluateExpr(expression),
            LookupEvaluationError,
            `The keyword "this" only works in the context of a specific entry.`,
        );
    });
});
