/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { log } from "neolace/app/log.ts";
import { SiteSchemaData } from "neolace/deps/neolace-sdk.ts";
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
            RETURN et.key AS entryTypeKey, config.lookupExpression AS lookupExpression
        `.givesShape({ entryTypeKey: Field.String, lookupExpression: Field.String }));

        configuredOnThisSite.forEach((config) => {
            const entryTypeKey = config.entryTypeKey;
            if (!(entryTypeKey in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeKey].enabledFeatures[featureType] = {
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

    async editFeature(_entryId, _editData) {
        // There is no special edit type to change an entry's hero image.
        // The feature image is determined by a lookup expression, which usually references some standard relationship
        // or property. To change the hero image, then, you have to edit that relationship or property using the normal
        // edit API.
        return { modifiedNodes: [], oldValues: {} };
    },

    /**
     * Load the details of this feature for a single entry.
     */
    async loadData({ tx, config, entryId, refCache }) {
        const siteId = await siteIdForEntryId(entryId);
        const context = new LookupContext({ tx, siteId, entryId, defaultPageSize: 1n });

        let value;
        try {
            value = await context.evaluateExpr(config.lookupExpression).then((v) => v.makeConcrete());
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
            caption = (await tx.pullOne(Entry, (e) => e.name, { id: imageEntryId })).name;
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
            sizing: imageData.sizing,
            width: imageData.width,
            height: imageData.height,
            blurHash: imageData.blurHash,
            borderColor: imageData.borderColor,
        };
    },
});
