import React from "react";

import { IN_BROWSER } from "lib/config";
import { AvailablePluginsContext, PluginDefinition } from "./ui-plugins";


// The following code to dynamically import plugins works with Babel but does not work with SWC until
// https://github.com/vercel/next.js/issues/31054 is resolved.

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

import * as searchModule from "../../plugins/search/plugin-definition";
const searchPlugin: PluginDefinition = {id: "search", ...searchModule};
const result = [
  searchPlugin,
];

if (!IN_BROWSER) {
    console.debug(`Loaded ${result.length} frontend plugins, available for server-side rendering.`);
}

export const AvailablePluginsProvider = ((props: {children: React.ReactNode}) => 
    <AvailablePluginsContext.Provider value={result}>{props.children}</AvailablePluginsContext.Provider>
);
