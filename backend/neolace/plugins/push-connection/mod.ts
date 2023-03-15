/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { definePlugin } from "neolace/plugins/mod.ts";
import { PushEditResource } from "./rest-api.ts";

export const thisPlugin = definePlugin({
    name: "Push Connection (built-in)",
    id: "push-connection",
    version: "0.0.1",
    restApiResources: [
        PushEditResource,
    ],
    dataVNodeClasses: [
        // No special data nodes are required for this plugin.
    ],
});
