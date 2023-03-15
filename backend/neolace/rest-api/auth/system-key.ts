/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { createRandomToken } from "neolace/lib/secure-token.ts";
import { hashSystemKey } from "neolace/rest-api/auth-middleware.ts";

export class SystemKeyResource extends NeolaceHttpResource {
    public paths = ["/auth/system-key"];

    GET = this.method({
        responseSchema: SDK.schemas.Schema({
            systemKey: SDK.schemas.string,
            systemKeyHash: SDK.schemas.string,
        }),
        description:
            "Generate a secure system API key (you must still update the configuration manually before it will work though)",
    }, async () => {
        const systemKey = `SYS_KEY_${(await createRandomToken()).toUpperCase()}`;
        const systemKeyHash = await hashSystemKey(systemKey);
        return {
            systemKey,
            systemKeyHash,
        };
    });
}
