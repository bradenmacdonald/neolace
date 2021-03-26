import { C, newDataRequest, UUID } from "vertex-framework";

import { suite, test, assert, beforeEach } from "../../lib/intern-tests";
import { graph } from "../graph";
import { CreateSite } from "../Site";
import { EntryType } from "./EntryType";
import { ExpandSchema_AddEntryType } from "./Expand-Contract-Schema";

suite(__filename, () => {

    let siteUUID: UUID;

    beforeEach(async () => {
        const site = await graph.runAsSystem(CreateSite({shortId: "site-default", description: "Default site for testing."}));
        siteUUID = site.uuid;
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
                    siteUUID,
                }),
            );

            // Now assert that it does exist:
            const result = await getIt();
            assert.isNotEmpty(result);
            assert.equal(result[0].name, name);
        });
    });
});
