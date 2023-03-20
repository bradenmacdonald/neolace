/**
 * @author MacDonald Thoughtstuff Inc.
 * @license Unlicense (see https://unlicense.org/ - public domain, use as you will, but no warranty of any kind)
 */
import { assertEquals } from "neolace/lib/tests.ts";
import { createRandomToken } from "./secure-token.ts";

Deno.test("createRandomToken", async (t) => {
    await t.step("it has a length of 64 characters by default", async () => {
        const token: string = await createRandomToken();
        assertEquals(token.length, 64);
    });
    await t.step("it is different every time", async () => {
        // Generate [count] tokens and make sure they're all unique
        const count = 1_000;
        const tokens = new Set();
        for (let i = 0; i < count; i++) {
            tokens.add(await createRandomToken());
        }
        assertEquals(tokens.size, count);
    });
});
