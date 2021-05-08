import { C, newDataRequest, VNID } from "vertex-framework";

import { suite, test, assert, beforeEach } from "../../lib/intern-tests";
import { graph } from "../graph";
import { CreateSite } from "../Site";
import { EntryType } from "./EntryType";
import { ExpandSchema_AddEntryType } from "./Expand-Contract-Schema";

suite(__filename, () => {

    let siteId: VNID;

    beforeEach(async () => {
        const site = await graph.runAsSystem(CreateSite({slugId: "site-default", domain: "test.neolace.net"}));
        siteId = site.id;
    });

    suite("ExpandSchema_AddEntryType", () => {

        test("can add a new entry type.", async () => {
            const name = "Note";

            // First check that this entry type doesn't yet exist:
            const getIt = (): Promise<{name: string}[]> => graph.pull(EntryType, et => et.name, {where: C`@this.name = ${name}`});
            assert.isEmpty(await getIt());

            // Now, create this entry type:
            await graph.runAsSystem(
                ExpandSchema_AddEntryType({
                    class: "regular",
                    name,
                    siteId,
                }),
            );

            // Now assert that it does exist:
            const result = await getIt();
            assert.isNotEmpty(result);
            assert.equal(result[0].name, name);
        });
    });
});
