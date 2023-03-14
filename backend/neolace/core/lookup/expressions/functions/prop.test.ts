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
import { PropertyValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("prop.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Can look up a property by VNID", async () => {
        assertEquals(
            await context.evaluateExpr(`prop("${defaultData.schema.properties.parentGenus.key}")`),
            new PropertyValue(defaultData.schema.properties.parentGenus.key),
        );
    });

    test("Does not return properties from other sites", async () => {
        const otherSiteContext = new TestLookupContext({ siteId: defaultData.otherSite.id });

        const expr = `prop("${defaultData.schema.properties.parentGenus.key}")`;
        assertEquals(
            await context.evaluateExpr(expr),
            new PropertyValue(defaultData.schema.properties.parentGenus.key),
        );
        await assertRejects(
            () => otherSiteContext.evaluateExpr(expr, undefined),
            LookupEvaluationError,
            "Property not found.",
        );
    });
});
