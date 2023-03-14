/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { NeolaceHttpResource } from "neolace/rest-api/mod.ts";
import { LookupFunctionClass } from "../core/lookup/expressions/functions/base.ts";
import { VNID, VNodeType } from "../deps/vertex-framework.ts";

const _isPluginSymbol = Symbol("isNeolacePlugin");

export interface NeolacePluginDefinition {
    name: string;
    id: string;
    /** The version of this plugin, in whatever format you like. Ideally should be a semver string like "0.0.0" */
    version: string;
    restApiResources?: (typeof NeolaceHttpResource)[];
    dataVNodeClasses?: VNodeType[];
    lookupFunctions?: LookupFunctionClass[];
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
        [_isPluginSymbol]: true as const,
    });
}

export function isPlugin(object: unknown): object is NeolacePlugin {
    return object !== null && typeof object === "object" && _isPluginSymbol in object;
}
