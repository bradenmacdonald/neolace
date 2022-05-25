import * as log from "std/log/mod.ts";
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
    ): Promise<void> {
        // First adjust the response as per the normal base class handling:
        super.catch(error, request, response);
        // Then log the error message:
        const parsedUrl = new URL(request.url);
        const msg = `${request.method} ${parsedUrl.pathname} -> ${response.status}: ${error.name}: ${error.message}`;
        log.error(msg);
    }
}
