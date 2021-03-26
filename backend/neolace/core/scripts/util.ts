import { log } from "../../app/log";
import { shutdown } from "../../app/shutdown";

/**
 * Helper to run an async function as a top-level script and then exit cleanly.
 * @param fn 
 */
export function runScript(promise: Promise<void>): void {
    promise.catch((err) => {
        log.error(err);
        log.debug(err.stack);
    }).finally(() => {
        shutdown();
    });
}
