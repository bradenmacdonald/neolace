import { assert, group, test } from "neolace/lib/tests.ts";
import { testExports } from "neolace/core/User.ts";

group(import.meta, () => {
    group("createBotAuthToken", () => {
        const { createBotAuthToken } = testExports;

        test("does not contain any '.' (so is easily distinguished from a JWT like our human users use)", async () => {
            const token: string = await createBotAuthToken();
            assert(!token.includes("."));
        });
    });
});
