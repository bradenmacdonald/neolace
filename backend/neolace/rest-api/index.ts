/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Drash, NeolaceHttpResource } from "neolace/rest-api/mod.ts";

export class HomePageResource extends NeolaceHttpResource {
    public paths = ["/"];

    public GET(_request: Drash.Request, response: Drash.Response): void {
        response.html(`
            <html>
                <head><title>Neolace API</title></head>
                <body>
                    This is the <strong>neolace<strong> API.
                </body>
            </html>
        `);
    }
}
