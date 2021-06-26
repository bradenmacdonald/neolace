import { isVNID, VNID } from "neolace/deps/vertex-framework.ts";
import { suite, test, assert, before, beforeEach, setTestIsolation, getClient, assertRejectsWith, assertRejects } from "../../../../lib/intern-tests";

group(import.meta, () => {

    suite("Creating a draft", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        /**
         * This tests creating an empty draft
         */
        test("can create an empty draft", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = getClient(defaultData.users.admin, defaultData.site.shortId);
            const result = await client.createDraft({
                title: "A Test Draft",
                description: null,
            });
            assert.isTrue(isVNID(result.id));
        });

    });
});
