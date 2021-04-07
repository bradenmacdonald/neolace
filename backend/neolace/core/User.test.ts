import { C, newDataRequest, UUID } from "vertex-framework";

import { suite, test, assert, beforeEach } from "../lib/intern-tests";
import { graph } from "./graph";
import { testExports } from "./User";

suite(__filename, () => {

    suite("createBotAuthToken", () => {

        const {createBotAuthToken} = testExports;

        test("has a length of 64 characters", async () => {
            const token: string = await createBotAuthToken();
            assert.lengthOf(token, 64);
        });

        test("is different every time", async () => {
            // Generate [count] tokens and make sure they're all unique
            const count = 1_000;
            const tokens = new Set();
            for (let i = 0; i < count; i++) {
                tokens.add( await createBotAuthToken() );
            }
            assert.equal(tokens.size, count);
        });

        test("does not contain any '.' (so is easily distinguished from a JWT like our human users use)", async () => {
            const token: string = await createBotAuthToken();
            assert.notInclude(token, ".");
        });
    });
});
