import { SiteSchemaData } from "neolace/deps/neolace-api.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import type { EnabledFeature } from "./EnabledFeature.ts";

/**
 * A "feature" is some functionality that can be enbabled, disabled, and configured for each EntryType.
 * 
 * For example, if an EntryType has the "Article" feature, then entries of that type can have article content.
 */
export interface EntryTypeFeature<FT extends keyof SiteSchemaData["entryTypes"][0]["enabledFeatures"], EF extends typeof EnabledFeature> {
    featureType: FT;
    configClass: EF;
    /**
     * Scan the database and for all entry types in the given site that have this feature enabled, update the schema
     * data accordingly.
     * 
     * This is used when generating the SiteSchemaData from the current Neolace database.
     * @param mutableSchema 
     * @param tx 
     * @param siteId 
     */
    contributeToSchema(mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID): Promise<void>;
    /**
     * Enabled and update the configuration of this feature. This is called when applying the "UpdateEntryTypeFeature"
     * schema edit.
     */
    updateConfiguration(
        entryTypeId: VNID,
        config: SiteSchemaData["entryTypes"][0]["enabledFeatures"][FT],
        tx: WrappedTransaction,
        markNodeAsModified: (vnid: VNID) => void,
    ): Promise<void>;
}

// Helper function to declare objects with the above interface with proper typing.
export function EntryTypeFeature<FT extends keyof SiteSchemaData["entryTypes"][0]["enabledFeatures"], EF extends typeof EnabledFeature>(args: EntryTypeFeature<FT, EF>): EntryTypeFeature<FT, EF> {
    // Also freeze it to make sure it's immutable
    return Object.freeze(args);
}
