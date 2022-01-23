import * as log from "std/log/mod.ts";
import { SiteSchemaData } from "neolace/deps/neolace-api.ts";
import { Schema } from "neolace/deps/computed-types.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";

import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { HeroImageFeatureEnabled } from "./HeroImageFeatureEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry, siteIdForEntryId } from "neolace/core/entry/Entry.ts";
import { HeroImageData } from "./HeroImageData.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import { AnnotatedValue, EntryValue, InlineMarkdownStringValue, PageValue } from "neolace/core/lookup/values.ts";
import { getEntryFeatureData } from "../get-feature-data.ts";

const featureType = "HeroImage" as const;

/**
 * The "Hero Image" feature allows each entry of the configured EntryType to display a large image at the top of the
 * entry. The image itself is another entry, whose type must have the "Image" feature enabled.
 */
export const HeroImageFeature = EntryTypeFeature({
    featureType,
    configClass: HeroImageFeatureEnabled,
    dataClass: HeroImageData,
    updateFeatureSchema: Schema({}),
    async contributeToSchema(mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) {
        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${HeroImageFeatureEnabled})
            WITH et, config
            RETURN et.id AS entryTypeId, config.lookupExpression AS lookupExpression
        `.givesShape({ entryTypeId: Field.VNID, lookupExpression: Field.String }));

        configuredOnThisSite.forEach((config) => {
            const entryTypeId: VNID = config.entryTypeId;
            if (!(entryTypeId in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeId].enabledFeatures[featureType] = {
                lookupExpression: config.lookupExpression,
            };
        });
    },
    async updateConfiguration(entryTypeId, config, tx, markNodeAsModified) {
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${HeroImageFeatureEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}
            SET feature.lookupExpression = ${config.lookupExpression}
        `.RETURN({ "feature.id": Field.VNID }));

        // We need to mark the HeroImageFeatureEnabled node as modified:
        markNodeAsModified(result["feature.id"]);
    },

    async editFeature(_entryId, _editData, _tx, _markNodeAsModified): Promise<void> {
        // There is no special edit type to change an entry's hero image.
        // The feature image is determined by a lookup expression, which usually references some standard relationship
        // or property. To change the hero image, then, you have to edit that relationship or property using the normal
        // edit API.
    },

    /**
     * Load the details of this feature for a single entry.
     */
    async loadData({ tx, config, entryId, refCache }) {
        const siteId = await siteIdForEntryId(entryId);
        const context: LookupContext = { tx, siteId, entryId, defaultPageSize: 1n };

        let value;
        try {
            value = await parseLookupString(config.lookupExpression).getValue(context).then((v) => v.makeConcrete());
        } catch (err: unknown) {
            if (err instanceof LookupError) {
                log.error(err.message);
                return undefined;
            } else {
                throw err;
            }
        }

        let caption = "";
        let imageEntryId: VNID;

        // If we got a list of values, take the first one:
        if (value instanceof PageValue) {
            if (value.values.length === 0) {
                return undefined;
            }
            value = value.values[0];
        }

        if (value instanceof AnnotatedValue && value.value instanceof EntryValue) {
            imageEntryId = value.value.id;
            if (value.annotations.note) {
                const captionValue = await value.annotations.note.castTo(InlineMarkdownStringValue, context);
                if (captionValue) {
                    caption = captionValue.value;
                }
            }
        } else if (value instanceof EntryValue) {
            imageEntryId = value.id;
        } else {
            log.error(
                `Cannot display hero image for entry ${entryId} because the lookup expression resulted in ${
                    JSON.stringify(value.toJSON())
                }`,
            );
            return undefined;
        }

        if (caption === "") {
            caption = (await tx.pullOne(Entry, (e) => e.name, { key: imageEntryId })).name;
        }

        const imageData = await getEntryFeatureData(imageEntryId, { featureType: "Image", tx });
        if (imageData === undefined) {
            log.error(
                `Cannot display hero image for entry ${entryId} because the lookup expression resulted in entry ${imageEntryId} which is not an image.`,
            );
            return undefined;
        }

        refCache?.addReferenceToEntryId(imageEntryId);
        if (caption) {
            refCache?.extractMarkdownReferences(caption, { currentEntryId: imageEntryId });
        }

        return {
            caption,
            entryId: imageEntryId,
            imageUrl: imageData.imageUrl,
            width: imageData.width,
            height: imageData.height,
            blurHash: imageData.blurHash,
        };
    },
});
