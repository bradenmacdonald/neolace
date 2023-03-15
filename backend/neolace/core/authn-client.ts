/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { KeratinAuthNClient } from "neolace/deps/authn-deno.ts";
import { config } from "neolace/app/config.ts";

export const authClient = new KeratinAuthNClient({
    // appDomains: config.frontendDomains,
    appDomain: config.frontendDomains[0],
    authnUrl: config.authnUrl,
    authnPrivateUrl: config.authnPrivateUrl,
    username: config.authnApiUsername,
    password: config.authnApiPassword,
});
