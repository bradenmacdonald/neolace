/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { AnyLookupValue, MDT } from "neolace/deps/neolace-sdk.ts";
import { C, Field, isVNID, VNID } from "neolace/deps/vertex-framework.ts";
import { EntryTypeColor, PropertyType, ReferenceCacheData } from "neolace/deps/neolace-sdk.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Property } from "neolace/core/schema/Property.ts";
import type { LookupContext } from "neolace/core/lookup/context.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

/**
 * A reference cache contains:
 * - The values of any lookup expressions used in the Markdown content of an entry (or the descriptions of related
 *   entries.
 * - Basic details about any properties, entryies, and entry types referenced by the entry.
 *
 * It also works for contexts like the home page, which isn't an entry but can still contain lookup expressions and
 * links to entries.
 */
export class ReferenceCache {
    private _entryIdsUsed = new Set<VNID>();
    private _entryKeysUsed = new Set<string>();
    private _propertyKeysUsed = new Set<string>();
    private _entryTypeKeysUsed = new Set<string>();
    private _lookupExpressions: Array<{ entryContext?: VNID; lookupExpression: string }> = [];
    readonly siteId: VNID;

    constructor(args: { siteId: VNID }) {
        this._entryIdsUsed = new Set();
        this._entryKeysUsed = new Set();
        this._propertyKeysUsed = new Set();
        this.siteId = args.siteId;
    }

    public get entryIdsUsed(): ReadonlySet<VNID> {
        return this._entryIdsUsed;
    }
    public get entryKeysUsed(): ReadonlySet<string> {
        return this._entryKeysUsed;
    }
    public get propertyKeysUsed(): ReadonlySet<string> {
        return this._propertyKeysUsed;
    }

    async getData(lookupContext: LookupContext): Promise<ReferenceCacheData> {
        if (lookupContext.siteId !== this.siteId) throw new Error("Inconsistent site ID");

        const data: ReferenceCacheData = {
            entryTypes: {},
            entries: {},
            properties: {},
            lookups: [],
        };

        // Lookup expressions:
        const evaluateLookupExpressions = async (lookup: { entryContext?: VNID; lookupExpression: string }) => {
            if (
                data.lookups.find((x) =>
                    x.entryContext === lookup.entryContext && x.lookupExpression === lookup.lookupExpression
                )
            ) {
                return; // Already processed
            }
            const context = lookupContext.getContextFor(lookup.entryContext);
            const value = await context.evaluateExpr(lookup.lookupExpression).then((v) => v.makeConcrete());
            const valueJSON = value.toJSON();
            data.lookups.push({
                entryContext: lookup.entryContext,
                lookupExpression: lookup.lookupExpression,
                value: valueJSON,
            });
            // Extract any references from the resulting lookup value:
            this.extractLookupReferences(valueJSON, { currentEntryId: lookup.entryContext });
        };
        for (const lookup of this._lookupExpressions) {
            await evaluateLookupExpressions(lookup);
        }

        // Load basic data (name, description, type) for all entries referenced.

        // For some reason, in some cases, this query is horribly unoptimized and does slow label scans instead of uses
        // the indexes. So we use the version below which forces a smarter query plan.
        // const entryReferences = await lookupContext.tx.query(C`
        //     MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
        //     WHERE
        //         entry.siteNamespace = ${lookupContext.siteId}
        //         AND (
        //             entry.id IN ${Array.from(this._entryIdsUsed)}
        //             OR entry.key IN ${Array.from(this._entryKeysUsed)}
        //         )
        //     RETURN entry.id AS id, entry.key AS key, entry.name AS name, entry.description AS description, entryType.key AS entryTypeKey
        // `.givesShape({id: Field.VNID, key: Field.String, name: Field.String, description: Field.String, entryTypeKey: Field.String}));

        const entryReferences = await lookupContext.tx.query(C`
            CALL {
                MATCH (entry:${Entry})
                USING INDEX entry:VNode(id)
                WHERE
                    entry.siteNamespace = ${lookupContext.siteId} AND
                    entry.id IN ${Array.from(this._entryIdsUsed)}
                RETURN entry

                UNION

                MATCH (entry:${Entry})
                WHERE
                    entry.siteNamespace = ${lookupContext.siteId} AND
                    entry.key IN ${Array.from(this._entryKeysUsed)}
                RETURN entry
            }
            WITH entry
            MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
            RETURN entry.id AS id, entry.key AS key, entry.name AS name, entry.description AS description, entryType.key AS entryTypeKey
        `.givesShape({
            id: Field.VNID,
            key: Field.String,
            name: Field.String,
            description: Field.String,
            entryTypeKey: Field.String,
        }));
        for (const reference of entryReferences) {
            // Now add this reference and its entry type information to the cache
            data.entries[reference.id] = {
                id: reference.id,
                name: reference.name,
                key: reference.key,
                description: reference.description,
                entryType: { key: reference.entryTypeKey },
            };
            this.extractMarkdownReferences(reference.description, { currentEntryId: reference.id });
            this._entryTypeKeysUsed.add(reference.entryTypeKey);
        }
        // Now, the descriptions of referenced entries may contain lookup expressions that we need to evaluate:
        // TODO: maybe remove this, and fetch descriptions in real time? This is too much like recursion.
        for (const lookup of this._lookupExpressions) {
            await evaluateLookupExpressions(lookup);
        }

        // Entry types referenced:
        const entryTypeReferences = await lookupContext.tx.pull(
            EntryType,
            (et) => et.key.name.color.colorCustom.abbreviation,
            {
                where: C`@this.siteNamespace = ${this.siteId} AND @this.key IN ${Array.from(this._entryTypeKeysUsed)}`,
            },
        );
        for (const reference of entryTypeReferences) {
            data.entryTypes[reference.key] = {
                key: reference.key,
                name: reference.name,
                // The ?? below are temporary because older versions of the database schema didn't have color/abbreviation
                color: reference.color as EntryTypeColor ?? EntryTypeColor.Default,
                abbreviation: reference.abbreviation ?? "",
            };
            if (reference.color === EntryTypeColor.Custom && reference.colorCustom) {
                data.entryTypes[reference.key].colorCustom = reference.colorCustom;
            }
        }

        // Properties referenced:
        const propertyReferences = await lookupContext.tx.pull(
            Property,
            (p) => p.key.name.type.description.standardURL.rank.displayAs,
            { where: C`@this.siteNamespace = ${this.siteId} AND @this.key IN ${Array.from(this.propertyKeysUsed)}` },
        );
        for (const prop of propertyReferences) {
            // Now add this reference and its entry type information to the cache
            data.properties[prop.key] = {
                key: prop.key,
                name: prop.name,
                type: prop.type as PropertyType,
                description: prop.description,
                standardURL: prop.standardURL,
                rank: prop.rank,
                displayAs: prop.displayAs,
            };
        }

        return data;
    }

    public addReferenceToEntryId(entryId: VNID) {
        this._entryIdsUsed.add(entryId);
    }

    public addReferenceToEntryKey(entryKey: string) {
        this._entryKeysUsed.add(entryKey);
    }

    public addReferenceToPropertyKey(propertyKey: string) {
        this._propertyKeysUsed.add(propertyKey);
    }

    public addLookupExpression(data: { entryContext?: VNID; lookupExpression: string }) {
        const alreadyThere = this._lookupExpressions.find((entry) =>
            entry.entryContext === data.entryContext &&
            entry.lookupExpression === data.lookupExpression
        );
        if (alreadyThere) {
            return; // Already in the reference cache
        } else {
            this._lookupExpressions.push(data);
        }
    }

    /**
     * Given a serialized "Lookup Value" that is the result of evaluating a Graph Lookup expression, find all unique entry
     * IDs that are present in the value (recursively). Adds to the set(s) passed as a parameter
     */
    public extractLookupReferences(value: AnyLookupValue, args: { currentEntryId?: VNID }) {
        if (value.annotations) {
            for (const annotatedValue of Object.values(value.annotations)) {
                this.extractLookupReferences(annotatedValue, args);
            }
        }
        switch (value.type) {
            case "Page": {
                value.values.forEach((v) => this.extractLookupReferences(v, args));
                if (value.source?.entryId) {
                    this._entryIdsUsed.add(value.source.entryId);
                }
                return;
            }
            case "Entry": {
                this._entryIdsUsed.add(value.id);
                return;
            }
            case "EntryType": {
                this._entryTypeKeysUsed.add(value.key);
                return;
            }
            case "Property": {
                this._propertyKeysUsed.add(value.key);
                return;
            }
            case "Image": {
                this._entryIdsUsed.add(value.entryId);
                if (value.caption?.type === "InlineMarkdownString") {
                    this.extractMarkdownReferences(MDT.tokenizeMDT(value.caption.value, { inline: true }), args);
                }
                return;
            }
            case "InlineMarkdownString": {
                // Extract any references to entries linked from this inline string.
                this.extractMarkdownReferences(MDT.tokenizeMDT(value.value, { inline: true }), args);
                return;
            }
            case "Graph": {
                for (const entry of value.entries) {
                    this._entryIdsUsed.add(entry.entryId);
                }
                for (const relationship of value.rels) {
                    this._propertyKeysUsed.add(relationship.relTypeKey);
                }
                for (const relationship of value.borderingRelationships) {
                    this._propertyKeysUsed.add(relationship.relTypeKey);
                }
                return;
            }
            case "Boolean":
            case "Integer":
            case "Quantity":
            case "Range":
            case "String":
            case "Date":
            case "DatePartial":
            case "Null":
            case "Error":
            case "File":
            case "PluginValue":
                return;
            default:
                throw new Error(
                    // deno-lint-ignore no-explicit-any
                    `Fix this: extractLookupReferences() doesn't yet support ${(value as any).type} values.`,
                );
        }
    }

    /**
     * Given a markdown string (or optionally an abstract syntax tree [AST] if it's already parsed), find all unique entry
     * IDs that are mentioned.
     */
    public extractMarkdownReferences(
        markdown: string | MDT.RootNode | MDT.Node,
        args: { currentEntryId?: VNID; inline?: boolean },
    ) {
        if (typeof markdown === "string") {
            markdown = MDT.tokenizeMDT(markdown, { inline: args.inline ?? false });
        }

        const node = markdown;
        if (node.type === "link") {
            if (node.href.startsWith("/entry/")) {
                const entryKey = node.href.substring(7);
                // May be a key or VNID
                if (isVNID(entryKey)) {
                    this._entryIdsUsed.add(entryKey);
                } else {
                    this._entryKeysUsed.add(entryKey);
                }
            }
        } else if (node.type === "lookup_inline" || node.type === "lookup_block") {
            const lookupExpression = node.children[0].text;
            this.addLookupExpression({ entryContext: args.currentEntryId, lookupExpression });
        }
        if ("children" in node && node.children) {
            for (const child of node.children) {
                this.extractMarkdownReferences(child, args);
            }
        }

        if (markdown.type === "mdt-document" && markdown.footnotes) {
            for (const footnote of markdown.footnotes) {
                this.extractMarkdownReferences(footnote, args);
            }
        }
    }
}
