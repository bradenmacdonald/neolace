/**
 * @author MacDonald Thoughtstuff Inc.
 * @license public domain
 */
import { onShutDown } from "neolace/app/shutdown.ts";

type ResourceHandle<Resource> = { resource: Resource; stopFn: () => Promise<void> };

/**
 * This wrapper works with any resource that can be started and stopped or opened and
 * closed, like a server or a file or a database driver.
 * It ensures that only a single instance is ever running at one time, and that the
 * instance will be stopped/closed when the application exists. It can also be used
 * to stop the resource early such as at the end of a test case.
 * @param initFn
 * @returns
 */
export function defineStoppableResource<Resource>(
    initFn: () => Promise<ResourceHandle<Resource>>,
): [getter: () => Promise<Resource>, stopper: () => Promise<void>] {
    // While this server/driver/thingy is running, this handle is a promise that will
    // resolve
    let handle: Promise<ResourceHandle<Resource>> | undefined;

    const getter = async () => {
        if (handle === undefined) {
            handle = new Promise((resolve, reject) => {
                initFn().then(
                    (resource) => resolve(resource),
                    (error: unknown) => reject(error),
                );
            });
        }
        return (await handle).resource;
    };
    const stopper = async () => {
        if (handle) {
            const oldHandle = handle;
            handle = undefined;
            // If the resource is running, stop it:
            await (await oldHandle).stopFn();
        }
    };
    onShutDown(stopper);

    return [getter, stopper];
}
