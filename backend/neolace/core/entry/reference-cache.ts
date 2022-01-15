import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType, ReferenceCacheData } from "neolace/deps/neolace-api.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { Property } from "neolace/core/schema/Property.ts";
import type { CachedLookupContext } from "neolace/core/lookup/context.ts";


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
    private _friendlyIdsUsed = new Set<string>();
    private _propertyIdsUsed = new Set<VNID>();
    private _lookupExpressions: Array<{entryContext?: VNID; lookupExpression: string}> = [];
    readonly siteId: VNID;

    constructor(args: {siteId: VNID}) {
        this._entryIdsUsed = new Set();
        this._friendlyIdsUsed = new Set();
        this._propertyIdsUsed = new Set();
        this.siteId = args.siteId;
    }

    public get entryIdsUsed(): ReadonlySet<VNID> { return this._entryIdsUsed; }
    public get friendlyIdsUsed(): ReadonlySet<string> { return this._friendlyIdsUsed; }
    public get propertyIdsUsed(): ReadonlySet<VNID> { return this._propertyIdsUsed; }

    async getData(tx: WrappedTransaction, lookupContext: CachedLookupContext): Promise<ReferenceCacheData> {
        const siteCode = await siteCodeForSite(this.siteId);
        const data: ReferenceCacheData = {
            entryTypes: {},
            entries: {},
            properties: {},
            lookups: [],
        };

        // Lookup expressions:
        const evaluateLookupExpressions = async (lookup: {entryContext?: VNID; lookupExpression: string}) => {
            if (data.lookups.find(x => x.entryContext === lookup.entryContext && x.lookupExpression === lookup.lookupExpression)) {
                return;  // Already processed
            }
            const context = lookupContext.getContextFor(lookup.entryContext);
            const value = await context.evaluateExpr(lookup.lookupExpression).then(v => v.makeConcrete());
            const valueJSON = value.toJSON();
            data.lookups.push({
                entryContext: lookup.entryContext,
                lookupExpression: lookup.lookupExpression,
                value: valueJSON,
            });
            // Extract any references from the resulting lookup value:
            this.extractLookupReferences(valueJSON, {currentEntryId: lookup.entryContext});
        };
        for (const lookup of this._lookupExpressions) {
            await evaluateLookupExpressions(lookup);
        }

        // Entries referenced:
        const entryReferences = await tx.pull(Entry,
            e => e.id.name.description.friendlyId().type(et => et.id.name.site(s => s.id)),
            {where: C`@this.id IN ${Array.from(this.entryIdsUsed)} OR @this.slugId IN ${Array.from(this.friendlyIdsUsed).map(friendlyId => siteCode + friendlyId)}`},
        );
        for (const reference of entryReferences) {
            // Let's just do a double-check that we're not leaking information from another site - shouldn't happen in any case:
            if (reference.type?.site?.id !== this.siteId) {
                throw new Error(`Error, found an Entry ID from another site altogether (${reference.id}). Security issue?`);
            }
            // Now add this reference and its entry type information to the cache
            data.entries[reference.id] = {
                id: reference.id,
                name: reference.name,
                friendlyId: reference.friendlyId,
                description: reference.description,
                entryType: {id: reference.type.id},
            };
            this.extractMarkdownReferences(reference.description, {currentEntryId: reference.id});

            if (data.entryTypes[reference.type.id] === undefined) {
                data.entryTypes[reference.type.id] = {
                    id: reference.type.id,
                    name: reference.type.name,
                };
            }
        }
        // Now, the descriptions of referenced entries may contain lookup expressions that we need to evaluate:
        // TODO: remove this, and fetch descriptions in real time. This is too much like recursion
        for (const lookup of this._lookupExpressions) {
            await evaluateLookupExpressions(lookup);
        }

        const propertyReferences = await tx.pull(Property,
            p => p.id.name.type.descriptionMD.standardURL.importance.displayAs.site(s => s.id),
            {where: C`@this.id IN ${Array.from(this.propertyIdsUsed)}`},
        );
        for (const prop of propertyReferences) {
            // Let's just do a double-check that we're not leaking information from another site - shouldn't happen in any case:
            if (prop.site?.id !== this.siteId) {
                throw new Error(`Error, found an Property ID from another site altogether (${prop.id}). Security issue?`);
            }
            // Now add this reference and its entry type information to the cache
            data.properties[prop.id] = {
                id: prop.id,
                name: prop.name,
                type: prop.type as PropertyType,
                description: prop.descriptionMD,
                standardURL: prop.standardURL,
                importance: prop.importance,
                displayAs: prop.displayAs,
            };
        }

        return data;
    }

    public addReferenceToEntryId(entryId: VNID) {
        this._entryIdsUsed.add(entryId);
    }

    public addReferenceToPropertyId(propertyId: VNID) {
        this._propertyIdsUsed.add(propertyId);
    }

    public addLookupExpression(data: {entryContext?: VNID, lookupExpression: string}) {
        const alreadyThere = this._lookupExpressions.find(entry =>
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
    public extractLookupReferences(value: api.AnyLookupValue, args: {currentEntryId?: VNID}) {
        switch (value.type) {
            case "Page": {
                value.values.forEach(v => this.extractLookupReferences(v, args));
                return;
            }
            case "Annotated": {
                this.extractLookupReferences(value.value, args);
                return;
            }
            case "Entry": {
                this._entryIdsUsed.add(value.id);
                return;
            }
            case "Image": {
                this._entryIdsUsed.add(value.entryId);
                if (value.caption?.type === "InlineMarkdownString") {
                    this.extractMarkdownReferences(api.MDT.tokenizeMDT(value.caption.value, {inline: true}), args);
            }
                return;
            }
            case "InlineMarkdownString": {
                // Extract any references to entries linked from this inline string.
                this.extractMarkdownReferences(api.MDT.tokenizeMDT(value.value, {inline: true}), args);
                return;
            }
            case "Integer":
            case "String":
            case "Date":
            case "Null":
            case "Error":
                return;
            default:
                // deno-lint-ignore no-explicit-any
                throw new Error(`Fix this: extractLookupReferences() doesn't yet support ${(value as any).type} values.`);
        }
    }

    /**
    * Given a markdown string (or optionally an abstract syntax tree [AST] if it's already parsed), find all unique entry
    * IDs that are mentioned.
    */
    public extractMarkdownReferences(markdown: string|api.MDT.RootNode|api.MDT.Node, args: {currentEntryId?: VNID}) {
       if (typeof markdown === "string") {
           markdown = api.MDT.tokenizeMDT(markdown);
       }
   
       const node = markdown;
       if (node.type === "link") {
           if (node.href.startsWith("/entry/")) {
               const entryKey = node.href.substr(7);
               // May be a friendlyId or VNID
               if (isVNID(entryKey)) {
                   this._entryIdsUsed.add(entryKey);
               } else {
                   this._friendlyIdsUsed.add(entryKey);
               }
           }
       } else if (node.type === "lookup_inline" || node.type === "lookup_block") {
            this.addLookupExpression({entryContext: args.currentEntryId, lookupExpression: node.content});
       }
       if ("children" in node) {
           for (const child of node.children) {
               this.extractMarkdownReferences(child, args);
           }
       }
   }

}
