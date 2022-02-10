import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import * as api from "neolace/deps/neolace-api.ts";

import { getGraph } from "neolace/core/graph.ts";
import { CachedLookupContext } from "neolace/core/lookup/context.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";
import { Entry } from "./Entry.ts";
import { getEntryProperties } from "./properties.ts";
import * as V from "neolace/core/lookup/values.ts";
import { siteShortIdFromId } from "neolace/core/Site.ts";

/**
 * Generate a version of this entry that can be used to build the search index.
 */
export async function entryToIndexDocument(entryId: VNID): Promise<api.EntryIndexDocument> {
    // log.info(`Reindexing ${entryId} to ${collection}`);
    const graph = await getGraph();
    const { entryData, properties, features } = await graph.read(async (tx) => ({
        entryData: await tx.pullOne(Entry, (e) =>
            e
                .id
                .name
                .description
                .friendlyId()
                .type((et) => et.id.name.site((s) => s.id)), { key: entryId }),
        properties: await getEntryProperties(entryId, { tx, limit: 1_000 }),
        // features (e.g. article text):
        features: await getEntryFeaturesData(entryId, { tx }),
    }));

    const siteId = entryData.type!.site!.id;
    const maxValuesPerProp = 100;

    let description = "";
    let articleText = "";
    const propertiesAsText: Record<string, string | string[]> = {};

    // Convert markdown fields into plain text, convert properties into values
    await graph.read(async (tx) => {
        const lookupContext = new CachedLookupContext(tx, siteId, entryId, BigInt(maxValuesPerProp));

        description = await markdownToPlainText(api.MDT.tokenizeMDT(entryData.description), lookupContext);
        articleText = await markdownToPlainText(api.MDT.tokenizeMDT(features?.Article?.articleMD ?? ""), lookupContext);

        for (const propValue of properties) {
            const stringValues = [];
            for (const fact of propValue.facts) {
                try {
                    const value = await lookupContext.evaluateExpr(fact.valueExpression);
                    stringValues.push(await lookupValueToPlainText(value, lookupContext));
                } catch {
                    log.warning(
                        `Cannot parse property value for search index: site ${await siteShortIdFromId(
                            siteId,
                        )} entry ${entryData.friendlyId}, property ${propValue.property.name}`,
                    );
                }
            }
            // In the search index, properties are identified by ID, not by makeSlug(property.name) even though the
            // latter is much more readable. The UI can load the whole schema and easily use it to display the full
            // property names, and this makes search queries stable even if properties are renamed.
            const propKey = "prop" + propValue.property.id;
            if (stringValues.length) {
                propertiesAsText[propKey] = stringValues;
            }
        }
    });

    return {
        id: entryId,
        friendlyId: entryData.friendlyId,
        name: entryData.name,
        type: entryData.type!.name,
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
async function markdownToPlainText(mdt: api.MDT.RootNode, lookupContext: CachedLookupContext): Promise<string> {
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

async function lookupValueToPlainText(value: V.LookupValue, context: CachedLookupContext): Promise<string> {
    value = await value.makeConcrete();
    if (value instanceof V.StringValue) {
        return value.value;
    } else if (value instanceof V.IntegerValue) {
        return String(value.value); // TODO: internationalize
    } else if (value instanceof V.EntryValue) {
        // TODO: this should be more performant, and re-use the cache where possible, but we have to implement ".name"
        //return lookupValueToPlainText(await context.evaluateExpr(value.asLiteral() + ".name"), context);
        return (await context.tx.pullOne(Entry, (e) => e.name, { key: value.id })).name;
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
