import { EntryFeaturesData, SiteSchemaData } from "neolace/deps/neolace-api.ts";
import { Type } from "neolace/deps/computed-types.ts";
import { RawVNode, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import type { EnabledFeature } from "./EnabledFeature.ts";
import type { EntryFeatureData } from "./EntryFeatureData.ts";

/**
 * A "feature" is some functionality that can be enbabled, disabled, and configured for each EntryType.
 * 
 * For example, if an EntryType has the "Article" feature, then entries of that type can have article content.
 */
export interface EntryTypeFeature<FT extends keyof SiteSchemaData["entryTypes"][0]["enabledFeatures"], EF extends typeof EnabledFeature, EFD extends EntryFeatureData, UFS> {
    featureType: FT;
    configClass: EF;
    dataClass: EFD;
    updateFeatureSchema: UFS;
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
     * Enabled and update the configuration of this feature, for all entries of a specific type. This is called when
     * applying the "UpdateEntryTypeFeature" schema edit.
     */
    updateConfiguration(
        entryTypeId: VNID,
        config: NonNullable<SiteSchemaData["entryTypes"][0]["enabledFeatures"][FT]>,
        tx: WrappedTransaction,
        markNodeAsModified: (vnid: VNID) => void,
    ): Promise<void>;

    /**
     * Update the details of this feature for a single entry.
     * e.g. if the "PlantImage" entry type has the "Image" feature enabled, then you can use this action to set the
     * image of a specific PlantImage entry.
     */
     editFeature(
        entryId: VNID,
        editData: Type<UFS>,
        tx: WrappedTransaction,
        markNodeAsModified: (vnid: VNID) => void,
    ): Promise<void>;

    /**
     * Load the details of this feature for a single entry.
     * e.g. if the "PlantImage" entry type has the "Image" feature enabled, then you can use this action to get the
     * URL of the actual image file that the entry holds.
     *
     * This funciton will only be called if the feature is enabled for the entry's type.
     */
    loadData(args: {
        entryId: VNID,
        /** Data (VNode of type dataClass) set on this specific entry */
        data?: RawVNode<EFD>,
        /** Configuration that controls how this feature is used for this entry type */
        config: RawVNode<EF>,
        tx: WrappedTransaction,
    }): Promise<EntryFeaturesData[FT]>;
}

// Helper function to declare objects with the above interface with proper typing.
export function EntryTypeFeature<FT extends keyof SiteSchemaData["entryTypes"][0]["enabledFeatures"], EF extends typeof EnabledFeature, EFD extends EntryFeatureData, UFS>(args: EntryTypeFeature<FT, EF, EFD, UFS>): EntryTypeFeature<FT, EF, EFD, UFS> {
    // Also freeze it to make sure it's immutable
    return Object.freeze(args);
}
