/**
 * TechNotes logging functions.
 */
import { config } from "./config";

const enum Colors {
    red = "31;1",
    light = "30;1",
    yellow = "33"
}

/** Apply a color to the specified string if logging to a terminal */
function applyColor(code: Colors, string: string): string {
    return process.stdout.isTTY ? `\x1B[${code}m${string}\x1B[0m` : string;
}
/**
 * Get the name of the calling file.
 * Courtesy https://stackoverflow.com/a/29581862/1057326
 */
function getCallerFile(): string {
    const originalFunc = Error.prepareStackTrace;
    let callerfile = "unknown";
    try {
        const err: any = new Error();
        Error.prepareStackTrace = (err, stack) => { return stack; };
        const currentfile = err.stack.shift().getFileName();
        while (err.stack.length) {
            callerfile = err.stack.shift().getFileName();
            if(currentfile !== callerfile) break;
        }
    } catch (e) {}
    Error.prepareStackTrace = originalFunc;
    return callerfile;
}

/**
 * Log the date and name of the calling file, as a prefix to the actual log message
 */
function prefix(): string {
    let shortFilePath = getCallerFile();
    // Convert '/app/technotes/foo/bar.ts' to just 'foo/bar'
    if (shortFilePath.endsWith(".ts")) {
        shortFilePath = shortFilePath.substr(0, shortFilePath.length - 3);
    }
    if (shortFilePath.indexOf("/technotes/") !== -1) {
        shortFilePath = shortFilePath.substr(shortFilePath.indexOf("/technotes/") + 11);
    }
    const prefix = `${(new Date()).toISOString().substr(0, 19)} ${shortFilePath} `;
    return applyColor(Colors.light, prefix);
}

/**
 * Log some message. This is for "normal" log messages; use the .debug(), .warn(),
 * and .error() method properties of this function for other types of message.
 * @param msg 
 */
export function log(msg: string): void {
    console.log(prefix() + msg);
}
log.trace = (): void => {
    console.trace();
}
log.debug = (msg: string): void => {
    if (config.debugLogging) {
        console.log(prefix() + applyColor(Colors.light, msg));
    }
}
log.success = (msg: string): void => { log("✅ " + msg); }
log.warn = (msg: string): void => {
    console.warn(prefix() + applyColor(Colors.yellow, "⚠️ Warning: ") + msg);
}
log.error = (msg: string): void => {
    console.error(prefix() + applyColor(Colors.red, "❌ Error: ") + msg);
}
