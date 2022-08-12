/**
 * Things to do on application shutdown, regardless of whether the application
 * is being used as a web server, a worker process, an admin shell, for tests,
 * or anything else.
 */
import * as log from "std/log/mod.ts";

const _onShutDown: Array<() => Promise<unknown>> = [];
export const onShutDown = (handler: () => Promise<unknown>): void => {
    _onShutDown.push(handler);
};
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
    prepareForShutdown().then(() => {
        const openResources = Object.values(Deno.resources).filter((name) => !name.startsWith("std"));
        if (openResources.length) {
            log.error("some resources were not released; not a clean shutdown. Found: " + openResources.join(", "));
            Deno.exit(1);
        }
        // TODO: why does this seem necessary lately?
        Deno.exit(0);
    });
}

// Watch for signals:
const sigintWatcher = async () => {
    log.info("Shutting down (SIGINT)...");
    await prepareForShutdown();
    Deno.exit(0);
};
Deno.addSignalListener("SIGINT", sigintWatcher);

const sigtermWatcher = async () => {
    log.info("Shutting down (SIGTERM)...");
    await prepareForShutdown();
    Deno.exit(0);
};
if (Deno.build.os !== "windows") {
    // SIGTERM is not supported on Windows
    Deno.addSignalListener("SIGTERM", sigtermWatcher);
}

onShutDown(async () => {
    Deno.removeSignalListener("SIGINT", sigintWatcher);
    if (Deno.build.os !== "windows") {
        Deno.removeSignalListener("SIGTERM", sigtermWatcher);
    }
});

// Checks to run just before we actually quit.
globalThis.addEventListener("unload", async () => {
    try {
        await prepareForShutdown();
    } catch (err) {
        log.error(`Unable to cleanup before exit: ${err}`);
        /* ignore errors, just log the message below. */
    }
    if (!shutdownCleanly) {
        log.warning(`Did not shut down cleanly; resources were not released.`);
    }
});
