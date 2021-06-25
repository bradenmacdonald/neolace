/**
 * Things to do on application shutdown, regardless of whether the application
 * is being used as a web server, a worker process, an admin shell, for tests,
 * or anything else.
 */
 import * as log from "std/log/mod.ts";

const _onShutDown: Array<() => Promise<unknown>> = [];
export const onShutDown = (handler: () => Promise<unknown>): void => { _onShutDown.push(handler); }
let shutdownCleanly = false;

/**
 * Release any resources and stop any running processes/connections that
 * we need to clean up before shutdown.
 */
async function prepareForShutdown(): Promise<void> {
    // Call each handler once, removing them from the _onShutDown array and then waiting for their promise.
    const pendingShutdownHandlers: Array<Promise<unknown>> = [];
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

Deno.signal(Deno.Signal.SIGINT).then(async () => {
    log.info("Shutting down (SIGINT)...");
    await prepareForShutdown();
    Deno.exit(0);
});
Deno.signal(Deno.Signal.SIGTERM).then(async () => {
    log.info("Shutting down (SIGTERM)...")
    await prepareForShutdown();
    Deno.exit(0);
});

// Checks to run just before we actually quit. This function must be synchronous.
window.addEventListener("unload", () => {
    if (!shutdownCleanly) {
        log.warning(`Did not shut down cleanly; resources were not released.`);
    }
});
