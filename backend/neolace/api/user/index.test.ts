import { ApiError } from "neolace-api";
import { suite, test, assert, beforeEach, setTestIsolation, getClient, assertRejects, assertRejectsWith } from "../../lib/intern-tests";

suite(__filename, () => {

    suite("Create a user account", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("can create an account with only an email, no other information", async () => {
            
            const client = getClient();

            const result = await client.registerHumanUser({email: "jamie456@example.com"});

            assert.deepStrictEqual(result, {
                isBot: false,
                fullName: null,
                username: "jamie456",
            });

        });

        test("can create an account an email and full name and username", async () => {
            
            const client = getClient();

            const result = await client.registerHumanUser({
                email: "jamie456@example.com",
                username: "JamieRocks",
                fullName: "Jamie Rockland",
            });

            assert.deepStrictEqual(result, {
                isBot: false,
                fullName: "Jamie Rockland",
                username: "JamieRocks",
            });

        });

    });
});
