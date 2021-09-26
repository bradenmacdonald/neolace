import {
    C,
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    VirtualPropType,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";
import { ContentType } from "neolace/deps/neolace-api.ts";
import { EntryType } from "../schema/EntryType.ts";
import { Entry } from "./Entry.ts";


/**
 * A property fact records a value for a property of an Entry (or all Entries of a particular EntryType)
 * 
 * e.g. if Bob (Entry of EntryType "Person") has a Birth Date (Entry of EntryType "PersonProperty", Category Property)
 *      of "1990-02-03" (property value), then a Property Fact is what ties those three things (Entry, Property, Value)
 *      together.
 *
 * The value is always expressed as a lookup expression, and so can be either a literal value or a computed value.
 */
export class PropertyFact extends VNodeType {
    static label = "PropertyFact";
    static properties = {
        ...VNodeType.properties,
        /** A Lookup expression (usually a literal expression) defining the value of this property value, e.g. "5" */
        valueExpression: Field.String,

        /** An optional MDT (Markdown) string explaining something about this property value */
        note: Field.String,
        
        // In future, we may want to be able to override "inherits" or "importance", which come from the property entry
    };

    static readonly rel = this.hasRelationshipsFromThisTo(() => ({
        // In addition to the PROP_FACT relationship from Entry/EntryType to this, there is this relationship _from_ this:
        PROP_ENTRY: {
            // This points to the Entry with Category "Property", e.g. "Birth Date" (Entry)
            to: [Entry],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
        // Either forEntry or forEntryType is set, but not both.
        forEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:PROP_FACT]-(@target:${Entry})`,
            target: Entry,
        },
        forEntryType: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:PROP_FACT]-(@target:${EntryType})`,
            target: EntryType,
        },
        // Property is always set:
        property: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.PROP_ENTRY}]->(@target:${Entry})`,
            target: Entry,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static defaultOrderBy = "@this.id";

    static async validate(dbObject: RawVNode<typeof PropertyFact>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);

        // Validate:
        const data = await tx.pullOne(PropertyFact, pf => pf
            .forEntry(fe => fe.id.type(et => et.site(s => s.id)))
            .forEntryType(et => et.id.site(s => s.id))
            .property(p => p.id.propertyValueType.type(et => et.contentType.site(s => s.id))),
            {key: dbObject.id}
        );

        // Validate that "property" entry has property ContentType; only such entries can be used as properties
        const propertyEntry = data.property;
        if (propertyEntry === null) { throw new Error("Missing property"); /* Should be caught by Vertex by TypeScript doesn't know that */ }
        if (propertyEntry.type?.contentType !== ContentType.Property) {
            throw new ValidationError(`A PropertyFact can only be used for a property that is an Entry with ContentType=Property`);
        }
        const siteId = propertyEntry.type?.site?.id;
        if (siteId === null) { throw new Error(`PropertyFact: siteId unexpectedly null`); }

        // A PropertyFact is attached to either an Entry or an EntryType, but never both:
        if (data.forEntry !== null) {
            // This PropertyFact is attached to an Entry
            if (data.forEntryType !== null) {
                throw new ValidationError("A PropertyFact must be attached to either an Entry or an EntryType");
            }
            if (data.forEntry.type?.site?.id !== siteId) {
                throw new ValidationError("PropertyFact: site mismatch - the entry's site doesn't match the property's");
            }

            // Validate that this property is unique
            const sameProperties = await tx.query(C`
                MATCH (e:${Entry} {id: ${data.forEntry.id}})-[:${Entry.rel.PROP_FACT}]->(pf:${this})-[:${this.rel.PROP_ENTRY}]->(p:${Entry} {id: ${propertyEntry.id}})
            `.RETURN({}));
            if (sameProperties.length !== 1) {
                throw new ValidationError("Multiple PropertyFacts exist for the same entry and property.");
            }
        } else {
            // This PropertyFact is attached to an EntryType and applies to all entries of that type
            if (data.forEntryType === null || data.forEntry !== null) {
                throw new ValidationError("A PropertyFact must be attached to either an Entry or an EntryType, and not both.");
            }
            if (data.forEntryType.site?.id !== siteId) {
                throw new ValidationError("PropertyFact: site mismatch - the entry's site doesn't match the property's");
            }

            // Validate that this property is unique
            const sameProperties = await tx.query(C`
                MATCH (e:${EntryType} {id: ${data.forEntryType.id}})-[:${Entry.rel.PROP_FACT}]->(pf:${this})-[:${this.rel.PROP_ENTRY}]->(p:${Entry} {id: ${propertyEntry.id}})
            `.RETURN({}));
            if (sameProperties.length !== 1) {
                throw new ValidationError("Multiple PropertyFacts exist for the same EntryType and property.");
            }
        }

        // TODO? Validate that the value is of the correct type, or can be casted to it.
    }
}
