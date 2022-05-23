import { VNID } from "neolace/deps/vertex-framework.ts";
import { getPluginsForSite } from "neolace/plugins/loader.ts";
import * as allExpressions from "../../expressions.ts";
import { LookupFunction, LookupFunctionClass } from "./base.ts";

export const builtInLookupFunctions = Object.values(allExpressions).filter((expr) =>
    expr.prototype instanceof LookupFunction
) as unknown as LookupFunctionClass[];

export async function getAllLookupFunctions(siteId?: VNID): Promise<LookupFunctionClass[]> {
    const functions = [...builtInLookupFunctions];
    if (siteId) {
        for (const _plugin of await getPluginsForSite(siteId)) {
            // TODO: if the plugin implements a lookup function, push it.
        }
    }
    return functions;
}
