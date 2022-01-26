import { NeolaceHttpResource } from "neolace/api/mod.ts";
import { VNID } from "../deps/vertex-framework.ts";

export interface NeolacePluginDefinition {
    name: string;
    id: string;
    version: string;
    restApiResources: (typeof NeolaceHttpResource)[] | undefined;
}

export interface NeolacePlugin extends NeolacePluginDefinition {
    isEnabledForSite(siteId: VNID): Promise<boolean>;
}

export function definePlugin(definition: NeolacePluginDefinition): NeolacePlugin {
    return Object.freeze({
        ...definition,
        async isEnabledForSite(_siteId: VNID) {
            return true;
        },
    });
}
