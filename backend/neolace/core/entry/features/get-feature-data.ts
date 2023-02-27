import { EntryFeaturesData } from "neolace/deps/neolace-sdk.ts";
import { C, convertNeo4jFieldValue, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { features as allFeatures } from "./all-features.ts";
import { EnabledFeature } from "./EnabledFeature.ts";
import { EntryFeatureData } from "./EntryFeatureData.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";

/**
 * Get data from each feature that's enabled for the given entry.
 */
export async function getEntryFeaturesData(
    entryId: VNID,
    { tx, filterType, refCache }: {
        tx: WrappedTransaction;
        filterType?: keyof EntryFeaturesData;
        refCache?: ReferenceCache;
    },
): Promise<EntryFeaturesData> {
    let features = allFeatures;
    if (filterType) {
        features = features.filter((f) => f.featureType === filterType);
    }

    const rows = await tx.query(C`
        // Find the EntryType
        MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
        // For each possible feature, check if it's enabled then load its data
        WITH e, et
        UNWIND ${
        features.map((f) => ({
            featureType: f.featureType,
            configLabel: f.configClass.label,
            dataLabel: f.dataClass.label,
        }))
    } AS f
        MATCH (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${EnabledFeature})
            WHERE f.configLabel IN labels(config)
        // Then, if the feature is currently enabled for entries of this type, load the data:
        OPTIONAL MATCH (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(data:${EntryFeatureData})
            WHERE f.dataLabel IN labels(data)
    `.RETURN({
        "f.featureType": Field.String,
        config: Field.Node,
        data: Field.Node,
    }));

    const result: EntryFeaturesData = {};

    for (const row of rows) {
        const feature = features.find((f) => f.featureType === row["f.featureType"]);
        if (feature === undefined) {
            throw new Error("Feature inconsistency in getEntryFeaturesData()");
        }

        // deno-lint-ignore no-explicit-any
        const data: any = row.data
            ? convertNeo4jFieldValue("data", row.data, Field.VNode(feature.dataClass))
            : undefined;
        // deno-lint-ignore no-explicit-any
        const config: any = row.config
            ? convertNeo4jFieldValue("config", row.config, Field.VNode(feature.configClass))
            : undefined;

        // deno-lint-ignore no-explicit-any
        const dataOut: any = await feature.loadData({
            entryId,
            data,
            config,
            tx,
            refCache,
        });
        if (dataOut !== undefined) {
            result[feature.featureType] = dataOut;
        }
    }

    return result;
}

/**
 * Get data for a specific feature for a specific entry
 */
export async function getEntryFeatureData<FT extends keyof EntryFeaturesData>(
    entryId: VNID,
    { featureType, tx }: { featureType: FT; tx: WrappedTransaction },
): Promise<EntryFeaturesData[FT]> {
    const result = await getEntryFeaturesData(entryId, { tx, filterType: featureType });
    return result[featureType];
}
