import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType, ReferenceCacheData } from "neolace/deps/neolace-api.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { Property } from "neolace/core/schema/Property.ts";


/**
 * A reference cache is a list of all the entry IDs mentioned in a given entry (description, markdown article text,
 * etc.) or mentioned in something like the homepage. The reference cache contains basic details about every mentioned
 * entry, like its friendlyId, its proper name, and its type name, so that we can display a friendly URL to it and a
 * tooltip with more information.
 */
export class ReferenceCache {

    private _entryIdsUsed = new Set<VNID>();
    private _friendlyIdsUsed = new Set<string>();
    private _propertyIdsUsed = new Set<VNID>();
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

    async getData(tx: WrappedTransaction): Promise<ReferenceCacheData> {
        const siteCode = await siteCodeForSite(this.siteId);
        const data: ReferenceCacheData = {
            entryTypes: {},
            entries: {},
            properties: {},
        };
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

            if (data.entryTypes[reference.type.id] === undefined) {
                data.entryTypes[reference.type.id] = {
                    id: reference.type.id,
                    name: reference.type.name,
                };
            }
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

    /**
     * Given a serialized "Lookup Value" that is the result of evaluating a Graph Lookup expression, find all unique entry
     * IDs that are present in the value (recursively). Adds to the set(s) passed as a parameter
     */
    public extractLookupReferences(value: api.AnyLookupValue) {
        switch (value.type) {
            case "List":
            case "Page": {
                value.values.forEach(v => this.extractLookupReferences(v));
                return;
            }
            case "Annotated": {
                this.extractLookupReferences(value.value);
                return;
            }
            case "Entry": {
                this._entryIdsUsed.add(value.id);
                return;
            }
            case "InlineMarkdownString": {
                // Extract any references to entries linked from this inline string.
                this.extractMarkdownReferences(api.MDT.tokenizeMDT(value.value, {inline: true}));
                return;
            }
            case "Integer":
            case "String":
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
    public extractMarkdownReferences(markdown: string|api.MDT.RootNode|api.MDT.Node) {
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
       }
       if ("children" in node) {
           for (const child of node.children) {
               this.extractMarkdownReferences(child);
           }
       }
   }

}
