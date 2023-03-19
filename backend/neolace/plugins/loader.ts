/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { log } from "neolace/app/log.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { isPlugin, NeolacePlugin } from "neolace/plugins/mod.ts";

let pluginsPromise: Promise<NeolacePlugin[]> | undefined = undefined;

export function getPlugins(): Promise<NeolacePlugin[]> {
    if (pluginsPromise) {
        return pluginsPromise;
    }
    pluginsPromise = (async () => {
        const pluginCache: NeolacePlugin[] = [];
        log.debug("Initializing plugins...");
        for (const plugin of config.plugins) {
            // For built-in plugins (in this folder), just specifying the name of the plugin folder is sufficient.
            // Otherwise, the plugin "mod" string should be the full import path/URL of the plugin's mod.ts file.
            const path = plugin.mod.includes("/") ? plugin.mod : `neolace/plugins/${plugin.mod}/mod.ts`;
            const mod = await import(path);
            if (mod && isPlugin(mod.thisPlugin)) {
                pluginCache.push(mod.thisPlugin);
            } else {
                throw new Error(
                    `Plugin file ${plugin.mod} was loaded but appears not to contain a valid Neolace plugin.`,
                );
            }
        }
        log.info(`Initialized ${pluginCache.length} plugins (${pluginCache.map((p) => p.id).join(", ")})`);
        return pluginCache;
    })();
    return pluginsPromise;
}

export async function getPluginsForSite(siteId: VNID): Promise<NeolacePlugin[]> {
    return (await getPlugins()).filter((plugin) => plugin.isEnabledForSite(siteId));
}
