/**
 * This file should only be imported asynchronously, with dynamic import
 */
import React from "react";

import { IN_BROWSER } from "lib/config";
import { AvailablePluginsContext, PluginDefinition } from "./ui-plugins";
import * as plugins from "../../plugins/enabled-plugins";

// The following code to dynamically import plugins works with Babel but does not work with SWC until
// https://github.com/vercel/next.js/issues/31054 is resolved.
// However, we probably don't need it, and it may make the code less efficient? Using an 'enabled plugins' file seems
// to work perfectly well, is simple, and is perhaps more efficient than dynamically loading many different plugins.

// const allPlugins = ["search"]
// const pluginLoaders = allPlugins.map((pluginId) =>
//     import(`../../plugins/${pluginId}/plugin-definition`).then(
//         (pluginDefinition: PluginDefinition) => ({
//             pluginId,
//             pluginDefinition,
//         })
//     )
// );
// const loadedPlugins = await Promise.all(pluginLoaders);
// const result: PluginDefinition[] = [];
// for (const {pluginId, pluginDefinition} of loadedPlugins) {
//     result.push({
//         ...pluginDefinition,
//         id: pluginId,
//     });
// }

/** To provide all the available plugins to server-site code: */
export const allPlugins: PluginDefinition[] = Object.values(plugins).filter(p => p.id);

if (!IN_BROWSER) {
    console.debug(`Loaded ${allPlugins.length} frontend plugins, available for server-side rendering.`);
}

/** To provide all the available plugins to React: */
export const AvailablePluginsProvider =
    ((props: { children: React.ReactNode }) => (
        <AvailablePluginsContext.Provider value={allPlugins}>{props.children}</AvailablePluginsContext.Provider>
    ));
