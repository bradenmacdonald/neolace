/**
 * @author MacDonald Thoughtstuff Inc.
 * @license public domain
 */
import * as stdLog from "std/log/mod.ts";
import { bold, gray, red, yellow } from "std/fmt/colors.ts";

// Fix the awkward Deno std log API by wrapping it.
// This will also change the log functions so that they'll convert any arguments to nicely formatted strings.
const getLogger = stdLog.getLogger;
const fmt = (msg: unknown) => typeof msg === "string" ? msg : Deno.inspect(msg);
export const log = {
    warning(...args: unknown[]) {
        getLogger().warning(() => args.map((a) => fmt(a)).join(" "));
    },
    debug(...args: unknown[]) {
        getLogger().debug(() => args.map((a) => fmt(a)).join(" "));
    },
    info(...args: unknown[]) {
        getLogger().info(() => args.map((a) => fmt(a)).join(" "));
    },
    error(...args: unknown[]) {
        getLogger().error(() => args.map((a) => fmt(a)).join(" "));
    },
    critical(...args: unknown[]) {
        getLogger().critical(() => args.map((a) => fmt(a)).join(" "));
    },
    handlers: stdLog.handlers,
    setup: stdLog.setup,
};

/**
 * A nicer version of Deno's std ConsoleHandler
 * -> prints the logger name, info is in white, debug in gray
 */
export class NiceConsoleHandler extends stdLog.handlers.BaseHandler {
    override format(logRecord: stdLog.LogRecord): string {
        let msg = logRecord.msg;
        switch (logRecord.level) {
            case stdLog.LogLevels.DEBUG:
                msg = gray(msg);
                break;
            case stdLog.LogLevels.WARNING:
                msg = yellow(msg);
                break;
            case stdLog.LogLevels.ERROR:
                msg = red(msg);
                break;
            case stdLog.LogLevels.CRITICAL:
                msg = bold(red(msg));
                break;
            default: // INFO, NOTSET
                break;
        }

        if (logRecord.loggerName !== "default") {
            msg = gray(logRecord.loggerName + ": ") + msg;
        }

        return msg;
    }

    override log(msg: string) {
        console.log(msg);
    }
}
