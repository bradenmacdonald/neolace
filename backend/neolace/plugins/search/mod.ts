import { definePlugin } from "neolace/plugins/mod.ts";
import { SearchConnectionResource } from "./rest-api.ts";
import { SearchPluginIndexConfig } from "./SearchPluginIndexConfig.ts";

export const thisPlugin = definePlugin({
    name: "Search (built-in)",
    id: "search",
    version: "0.0.1",
    restApiResources: [
        SearchConnectionResource,
    ],
    dataVNodeClasses: [
        SearchPluginIndexConfig,
    ],
});
