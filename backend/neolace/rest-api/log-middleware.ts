/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as log from "std/log/mod.ts";
import type { ConnInfo } from "std/http/server.ts";
import { Drash } from "./mod.ts";

export class NeolaceLogService extends Drash.Service {
    public async runAfterResource(request: Drash.Request, response: Drash.Response): Promise<void> {
        const parsedUrl = new URL(request.url);
        const msg = `${request.method} ${parsedUrl.pathname} -> ${response.status}`;
        if (response.status >= 400) {
            log.warning(msg);
        } else {
            log.info(msg);
        }
    }
}

export class NeolaceErrorLogger extends Drash.ErrorHandler {
    public override async catch(
        error: Drash.Errors.HttpError,
        request: Request,
        response: Drash.Response,
        connInfo: ConnInfo,
    ): Promise<void> {
        // First adjust the response as per the normal base class handling:
        super.catch(error, request, response, connInfo);
        // Then log the error message:
        const parsedUrl = new URL(request.url);
        const msg = `${request.method} ${parsedUrl.pathname} -> ${response.status}: ${error.name}: ${error.message}`;
        log.error(msg + "\n" + error.stack);

        // Most of our CORS handling is in the NeolaceHttpResource base class, but here we have to handle a special case
        // to fix the CORS headers after an exception is thrown (e.g. by the auth middleware), so that our frontend can
        // get the error instead of just a generic CORS error.
        //
        // Neolace APIs are generally public and don't directly use cookies for authentication so we allow all origins.
        if (!response.headers.has("Access-Control-Allow-Origin")) {
            response.headers.set("Access-Control-Allow-Origin", request.headers.get("Origin") ?? "");
        }
    }
}
