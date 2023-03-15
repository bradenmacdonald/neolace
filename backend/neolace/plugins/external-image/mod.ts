/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { definePlugin } from "neolace/plugins/mod.ts";
import { ExternalImage } from "./externalImage.ts";

export const thisPlugin = definePlugin({
    name: "External Image (built-in)",
    id: "external-image",
    version: "0.0.1",
    lookupFunctions: [
        ExternalImage,
    ],
});
