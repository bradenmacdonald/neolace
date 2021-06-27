import { isVNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assert, getClient } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Creating a draft", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        /**
         * This tests creating an empty draft
         */
        test("can create an empty draft", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const result = await client.createDraft({
                title: "A Test Draft",
                description: null,
                edits: [],
            });
            assert(isVNID(result.id));
        });

    });
});
