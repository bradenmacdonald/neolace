import type { PluginDefinition } from "components/utils/ui-plugins"

export const plugin: PluginDefinition = {
    id: "cams",
    getPageForPath(site, path) {
        if (path === "/members-only") {
            return "members-only";
        }
        return undefined;
    },
};
