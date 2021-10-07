import { EntryFeaturesData } from "neolace/deps/neolace-api.ts";
import { C, VNID, WrappedTransaction, Field, convertNeo4jFieldValue } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { features } from "./all-features.ts";
import { EnabledFeature } from "./EnabledFeature.ts";
import { EntryFeatureData } from "./EntryFeatureData.ts";


/**
 * Get data from each feature that's enabled for the given entry.
 */
export async function getEntryFeatureData(entryId: VNID, {tx}: {tx: WrappedTransaction}) {
    const rows = await tx.query(C`
        // Find the EntryType
        MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
        // For each possible feature, check if it's enabled then load its data
        WITH e, et
        UNWIND ${features.map(f => ({
            featureType: f.featureType,
            configLabel: f.configClass.label,
            dataLabel: f.dataClass.label,
        }))} AS f
        MATCH (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${EnabledFeature})
            WHERE f.configLabel IN labels(config)
        // Then, if the feature is currently enabled for entries of this type, load the data:
        MATCH (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(data:${EntryFeatureData})
            WHERE f.dataLabel IN labels(data)
    `.RETURN({
        "f.featureType": Field.String,
        //config: Field.Node,
        data: Field.Node,
    }));

    const result: EntryFeaturesData = {};

    for (const row of rows) {
        const feature = features.find(f => f.featureType === row["f.featureType"]);
        if (feature === undefined) {
            throw new Error("Feature inconsistency in getEntryFeatureData()");
        }

        // deno-lint-ignore no-explicit-any
        const featureData: any = convertNeo4jFieldValue("data", row.data, Field.VNode(feature.dataClass));

        // deno-lint-ignore no-explicit-any
        const dataOut: any = await feature.loadData(featureData, tx);
        if (dataOut !== undefined) {
            result[feature.featureType] = dataOut;
        }
    }

    return result;
}
