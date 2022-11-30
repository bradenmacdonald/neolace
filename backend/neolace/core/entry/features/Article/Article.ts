import * as log from "std/log/mod.ts";
import { MDT, SiteSchemaData, UpdateEntryArticleSchema } from "neolace/deps/neolace-api.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { ArticleEnabled } from "./ArticleEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { ArticleData } from "./ArticleData.ts";
import { EntryFeatureData } from "../EntryFeatureData.ts";

const featureType = "Article" as const;

export const ArticleFeature = EntryTypeFeature({
    featureType,
    configClass: ArticleEnabled,
    dataClass: ArticleData,
    updateFeatureSchema: UpdateEntryArticleSchema,
    contributeToSchema: async (mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) => {
        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${ArticleEnabled})
            WITH et, config
            RETURN et.key AS entryTypeKey
        `.givesShape({ entryTypeKey: Field.String }));

        configuredOnThisSite.forEach((config) => {
            const entryTypeKey = config.entryTypeKey;
            if (!(entryTypeKey in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeKey].enabledFeatures[featureType] = {};
        });
    },
    updateConfiguration: async (
        entryTypeId: VNID,
        _config,
        tx: WrappedTransaction,
        markNodeAsModified: (vnid: VNID) => void,
    ) => {
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${ArticleEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}
        `.RETURN({ "feature.id": Field.VNID }));
        markNodeAsModified(result["feature.id"]);
    },
    async editFeature(entryId, editData, tx) {
        const query = C`
            MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            // Note that the code that calls this has already verified that this feature is enabled for this entry type.
            MERGE (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(propData:${ArticleData}:${C(EntryFeatureData.label)})
            ON CREATE SET
                propData.id = ${VNID()},
                propData.articleContent = ""
            WITH propData, propData.articleContent as oldArticleContent, ${editData.articleContent} as newArticleContent
            WITH propData, oldArticleContent, newArticleContent, newArticleContent<>oldArticleContent AS isDifferent
            SET propData += CASE WHEN isDifferent THEN {articleContent: newArticleContent} ELSE {} END
        `.RETURN({ "propData.id": Field.VNID, isDifferent: Field.Boolean, oldArticleContent: Field.String });

        // We run this using .run() so we can carefully check if the MERGE in the query above created a new entry or
        // not, because it affects what we return for 'modifiedNodes'
        const result = await tx.run(query.queryString, query.params);
        if (result.records.length !== 1) {
            throw new Error("Entry does not exist");
        }
        const isDifferent = result.records[0].get("isDifferent") as boolean;
        const createdFeatureDataNode = result.summary.counters.updates().nodesCreated === 1;

        if (!isDifferent && !createdFeatureDataNode) {
            // We didn't actually change the article text, and we didn't create the ArticleData node. Nothing happened.
            return { modifiedNodes: [], oldValues: {} };
        }

        return {
            modifiedNodes: [result.records[0].get("propData.id")],
            oldValues: {
                articleContent: result.records[0].get("oldArticleContent"),
            },
        };
    },
    /**
     * Load the details of this feature for a single entry.
     */
    async loadData({ data, refCache, entryId }) {
        const articleContent = data?.articleContent ?? "";

        const headings: { id: string; title: string }[] = [];
        // Parse the Markdown
        let parsed: MDT.RootNode;
        try {
            parsed = MDT.tokenizeMDT(articleContent);
        } catch (err: unknown) {
            log.error(`Markdown parsing error: ${err}`);
            parsed = { type: "mdt-document", children: [] };
        }

        // Extract the top-level headings from the document, so all API clients can display a consistent table of contents
        for (const node of parsed.children) {
            if (node.type === "heading" && node.level === 1) {
                headings.push({
                    title: node.children.map((c) => MDT.renderInlineToPlainText(c)).join(""),
                    id: node.slugId,
                });
            }
        }

        if (articleContent) {
            // If this article contains links to other entries or lookup expressions, we need to cache them in the
            // reference cache so that lookups can be evaluated and the tooltip shown on hover will render instantly.
            refCache?.extractMarkdownReferences(parsed, { currentEntryId: entryId });
        }

        return {
            articleContent,
            headings,
        };
    },
});
