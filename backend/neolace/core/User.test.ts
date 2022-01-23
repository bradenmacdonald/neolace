import { assert, assertEquals, group, test } from "neolace/lib/tests.ts";
import { testExports } from "neolace/core/User.ts";

group(import.meta, () => {
    group("createBotAuthToken", () => {
        const { createBotAuthToken } = testExports;

        test("has a length of 64 characters", async () => {
            const token: string = await createBotAuthToken();
            assertEquals(token.length, 64);
        });

        test("is different every time", async () => {
            // Generate [count] tokens and make sure they're all unique
            const count = 1_000;
            const tokens = new Set();
            for (let i = 0; i < count; i++) {
                tokens.add(await createBotAuthToken());
            }
            assertEquals(tokens.size, count);
        });

        test("does not contain any '.' (so is easily distinguished from a JWT like our human users use)", async () => {
            const token: string = await createBotAuthToken();
            assert(!token.includes("."));
        });
    });
});
