/**
 * Things to do on application shutdown, regardless of whether the application
 * is being used as a web server, a worker process, an admin shell, for tests,
 * or anything else.
 */
import { log } from "./log";

const _onShutDown: Array<() => Promise<any>> = [];
export const onShutDown = (handler: () => Promise<any>): void => { _onShutDown.push(handler); }
let shutdownCleanly = false;

/**
 * Release any resources and stop any running processes/connections that
 * we need to clean up before shutdown.
 */
async function prepareForShutdown(): Promise<void> {
    // Call each handler once, removing them from the _onShutDown array and then waiting for their promise.
    const pendingShutdownHandlers: Array<Promise<any>> = [];
    while (_onShutDown.length) {
        const nextHandler = _onShutDown.pop();
        if (nextHandler) { // Make TypeScript happy
            pendingShutdownHandlers.push(nextHandler());
        }
    }
    await Promise.all(pendingShutdownHandlers);
    shutdownCleanly = true;
}

/** Do a clean, controlled shutdown. */
export function shutdown(): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    prepareForShutdown();
}

process.on("SIGINT", async () => {
    log("Shutting down (SIGINT)...");
    await prepareForShutdown();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    log("Shutting down (SIGTERM)...")
    await prepareForShutdown();
    process.exit(0);
});
process.on("uncaughtException", (err) => {
    log.error(`Uncaught exception: ${err.message}\n${err.stack}`);
    process.exit(1);
});

// Checks to run just before we actually quit. This function must be synchronous.
process.on("exit", (code) => {
    if (!shutdownCleanly) {
        log.warn(`Did not shut down cleanly; resources were not released.`);
    }
});
