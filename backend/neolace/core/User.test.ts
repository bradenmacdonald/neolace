/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assert, group, test } from "neolace/lib/tests.ts";
import { testExports } from "neolace/core/User.ts";

group("User.ts", () => {
    group("createBotAuthToken", () => {
        const { createBotAuthToken } = testExports;

        test("does not contain any '.' (so is easily distinguished from a JWT like our human users use)", async () => {
            const token: string = await createBotAuthToken();
            assert(!token.includes("."));
        });
    });
});
