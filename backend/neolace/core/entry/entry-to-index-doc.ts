import * as log from "std/log/mod.ts";
import { C, VNID } from "neolace/deps/vertex-framework.ts";
import * as api from "neolace/deps/neolace-api.ts";

import { getGraph } from "neolace/core/graph.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";
import { Entry } from "./Entry.ts";
import { EntryPropertyValueSet, getEntryProperties } from "./properties.ts";
import * as V from "neolace/core/lookup/values.ts";
import { siteKeyFromId } from "neolace/core/Site.ts";
import { checkPermissions } from "neolace/core/permissions/check.ts";
import { ActionObject } from "neolace/core/permissions/action.ts";

interface EntryRequiredData {
    name: string;
    description: string;
    key: string;
    entryTypeKey: string;
    entryTypeName: string;
    siteId: VNID;
    properties: EntryPropertyValueSet[];
}

export async function preloadDataForIndexingEntries(entryIds: VNID[]): Promise<Record<VNID, EntryRequiredData>> {
    if (entryIds.length === 0) {
        return {};
    }
    const graph = await getGraph();
    return graph.read(async (tx) => {
        const entryDatas = await tx.pull(
            Entry,
            (e) => e.id.name.description.key.siteNamespace.type((et) => et.key.name),
            { where: C`@this.id IN ${entryIds}` },
        );

        const props = await getEntryProperties(entryIds, { tx, limit: 2_000 });

        const result: Record<VNID, EntryRequiredData> = {};

        for (const entry of entryDatas) {
            result[entry.id] = {
                name: entry.name,
                description: entry.description,
                key: entry.key,
                entryTypeKey: entry.type!.key,
                entryTypeName: entry.type!.name,
                siteId: entry.siteNamespace,
                properties: props.filter((ps) => ps.entryId === entry.id),
            };
        }

        return result;
    });
}

/**
 * Generate a version of this entry that can be used to build the search index.
 */
export async function entryToIndexDocument(
    entryId: VNID,
    preloadedData: EntryRequiredData,
): Promise<api.EntryIndexDocument> {
    // log.info(`Reindexing ${entryId} to ${collection}`);
    const graph = await getGraph();

    const siteId = preloadedData.siteId;
    const permSubject = { siteId, userId: undefined };
    const permObject: ActionObject = { entryId, entryTypeKey: preloadedData.entryTypeKey };
    const maxValuesPerProp = 100;

    let description = "";
    let articleText = "";
    const propertiesAsText: Record<string, string | string[]> = {};

    // Convert markdown fields into plain text, convert properties into values
    await graph.read(async (tx) => {
        const lookupContext = new LookupContext({ tx, siteId, entryId, defaultPageSize: BigInt(maxValuesPerProp) });
        const [canViewDescription, canViewProperties, canViewFeatures] = await checkPermissions(permSubject, [
            api.CorePerm.viewEntryDescription,
            api.CorePerm.viewEntryProperty,
            api.CorePerm.viewEntryFeatures,
        ], permObject);

        if (canViewDescription && preloadedData.description) {
            description = await markdownToPlainText(api.MDT.tokenizeMDT(preloadedData.description), lookupContext);
        }
        if (canViewFeatures) {
            const features = await getEntryFeaturesData(entryId, { tx, filterType: "Article" });
            if (features.Article?.articleContent) {
                articleText = await markdownToPlainText(
                    api.MDT.tokenizeMDT(features.Article.articleContent ?? ""),
                    lookupContext,
                );
            }
        }

        if (!canViewProperties) {
            return; // Skip indexing the properties below
        }

        for (const propValue of preloadedData.properties) {
            const stringValues = [];
            for (const fact of propValue.facts) {
                try {
                    const value = await lookupContext.evaluateExpr(fact.valueExpression);
                    stringValues.push(await lookupValueToPlainText(value, lookupContext));
                } catch {
                    log.warning(
                        `Cannot parse property value for search index: site ${await siteKeyFromId(
                            siteId,
                        )} entry ${preloadedData.key}, property ${propValue.property.name}`,
                    );
                }
            }
            if (stringValues.length) {
                propertiesAsText[`prop-${propValue.property.key}`] = stringValues;
            }
        }
    });

    return {
        id: entryId,
        key: preloadedData.key,
        name: preloadedData.name,
        entryTypeKey: preloadedData.entryTypeKey,
        description,
        articleText,
        visibleToGroups: ["public"],
        ...propertiesAsText,
    };
}

/**
 * Convert Markdown to plain text, including lookup values.
 * This is tricky because the MDT API is not asynchronous, but lookup evaluation is.
 */
async function markdownToPlainText(mdt: api.MDT.RootNode, lookupContext: LookupContext): Promise<string> {
    let placeholderCount = 0;
    const nextPlaceholder = () => `╼${placeholderCount++}╾`;
    const pendingValues: Promise<[placeholder: string, valueText: string]>[] = [];
    let text = api.MDT.renderToPlainText(mdt, {
        lookupToText: (lookupExpr) => {
            const placeholder = nextPlaceholder();
            pendingValues.push(
                new Promise((resolve) => {
                    lookupContext.evaluateExpr(lookupExpr).then(async (value) => {
                        const textValue = await lookupValueToPlainText(value, lookupContext);
                        resolve([placeholder, textValue]);
                    });
                }),
            );
            return placeholder;
        },
    });
    for await (const [placeholder, value] of pendingValues) {
        text = text.replace(placeholder, value);
    }
    return text;
}

async function lookupValueToPlainText(value: V.LookupValue, context: LookupContext): Promise<string> {
    value = await value.makeConcrete();
    if (value instanceof V.StringValue) {
        return value.value;
    } else if (value instanceof V.IntegerValue) {
        return String(value.value); // TODO: internationalize
    } else if (value instanceof V.EntryValue) {
        return lookupValueToPlainText(await context.evaluateExpr(value.asLiteral() + ".name"), context);
    } else if (value instanceof V.NullValue) {
        return "";
    } else if (value instanceof V.AnnotatedValue) {
        return lookupValueToPlainText(value.value, context);
    } else if (value instanceof V.PageValue) {
        return value.values.map((v) => lookupValueToPlainText(v, context)).join(", "); // TODO: internationalize
    } else if (value instanceof V.ErrorValue) {
        return value.error.message;
    }
    return `${value.constructor.name}`;
}
