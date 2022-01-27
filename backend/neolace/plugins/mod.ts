import { NeolaceHttpResource } from "neolace/api/mod.ts";
import { VNID, VNodeType } from "../deps/vertex-framework.ts";

const _isPluginSymbol = Symbol("isNeolacePlugin");

export interface NeolacePluginDefinition {
    name: string;
    id: string;
    /** The version of this plugin, in whatever format you like. Ideally should be a semver string like "0.0.0" */
    version: string;
    restApiResources?: (typeof NeolaceHttpResource)[];
    dataVNodeClasses?: VNodeType[];
}

/**
 * Class representing a Neolace Plugin. You cannot declare this directly. Instead, call definePlugin({...}) which will
 * create an instance of this interface for you.
 */
export interface NeolacePlugin extends NeolacePluginDefinition {
    isEnabledForSite(siteId: VNID): Promise<boolean>;
    [_isPluginSymbol]: true;
}

export function definePlugin(definition: NeolacePluginDefinition): NeolacePlugin {
    return Object.freeze({
        ...definition,
        async isEnabledForSite(_siteId: VNID) {
            return true;
        },
        [_isPluginSymbol]: true,
    });
}

export function isPlugin(object: unknown): object is NeolacePlugin {
    return object !== null && typeof object === "object" && _isPluginSymbol in object;
}
