import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    EmptyResultError,
    Field,
    getRelationshipType,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { PropertyMode, PropertyType } from "neolace/deps/neolace-api.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "../schema/EntryType.ts";
import { Property } from "../schema/Property.ts";
import { Entry } from "./Entry.ts";

export function directRelTypeForPropertyType(propType: PropertyType) {
    return (
        propType === PropertyType.RelIsA
            ? Entry.rel.IS_A
            : propType === PropertyType.RelOther
            ? Entry.rel.RELATES_TO
            : null
    );
}

/**
 * A property fact records a value for a property of an Entry.
 *
 * e.g. if Bob (Entry of EntryType "Person") has a Birth Date (Property) of "1990-02-03" (property value), then a
 *      Property Fact is what ties those three things (Entry, Property, Value) together.
 *
 * The value is usually expressed as a lookup expression, and so can be either a literal value or a computed value.
 * The exception is when the property is defining a relationship - in that case, the value is a relationship in the
 * graph database, not a lookup expression.
 */
export class PropertyFact extends VNodeType {
    static label = "PropertyFact";
    static properties = {
        ...VNodeType.properties,
        /**
         * A Lookup expression (usually a literal expression) defining the value of this property value, e.g. "5"
         */
        valueExpression: Field.String,

        /** An optional MDT (Markdown) string explaining something about this property value */
        note: Field.String,

        /**
         * If this property has multiple values (facts), this field determines their order. Rank 0 comes first,
         * then 1... Not to be confused with the rank of the overall property.
         */
        rank: Field.Int.Check(check.number.integer().min(0).max(999_999_999)),

        /** Slot allows selectively overwriting inherited entries, useful for HAS PART relationships */
        slot: Field.String,

        /**
         * If this is a relationship (from an Entry, to another Entry), then we actually create a direct relationship
         * between the entries (as well as this PropertyFact), and we store the Neo4j ID of that relationship here.
         *
         * It is generally recommended to
         * [avoid using Neo4j IDs](https://neo4j.com/docs/cypher-manual/current/clauses/match/#match-node-by-id),
         * but it is reasonable to do it in this case because:
         * 1. We cannot guarantee any other identifier for relationships is unique (there are no unique constraints) on
         *    relationships in Neo4j.
         * 2. Looking up relationships by ID is presumably much more performant than looking up by a user-defined ID
         *    that's neither indexed nor unique.
         * 3. We place a unique index on this "directRelNeo4jId" column, so we are somewhat protected against bugs from
         *    re-using IDs in different places - each relationship ID can only be referenced by at most one
         *    PropertyFact.
         */
        directRelNeo4jId: Field.NullOr.BigInt,
        // In future, we may want to be able to override "inherits" or "rank", which come from the property entry?
    };

    static readonly rel = this.hasRelationshipsFromThisTo(() => ({
        // In addition to the PROP_FACT relationship from Entry/EntryType to this, there is this relationship _from_ this:
        FOR_PROP: {
            to: [Property],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        // /**
        //  * Where this fact comes from / what entry "owns" this fact.
        //  * e.g. a DataTable Entry may be the source of hundreds of facts about other entries.
        //  * Or in the future, a source might be natural language processing of article text.
        //  */
        // HAS_FACT_SOURCE: { to: [Entry], cardinality: VNodeType.Rel.ToOneRequired, },
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
        entry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:PROP_FACT]-(@target:${Entry})`,
            target: Entry,
        },
        // Property is always set:
        property: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_PROP}]->(@target:${Property})`,
            target: Property,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static defaultOrderBy = "@this.id";

    static async validate(dbObject: RawVNode<typeof this>, tx: WrappedTransaction): Promise<void> {
        // Validate:
        const data = await tx.pullOne(PropertyFact, (pf) =>
            pf
                .entry((e) => e.id.type((et) => et.id.site((s) => s.id)))
                .property((p) => p.id.name.type.mode.enableSlots.site((s) => s.id)), { key: dbObject.id });
        const property = data.property;
        if (property === null) throw new Error("Internal error - property unexpectedly null.");

        const siteId = data.entry?.type?.site?.id;
        if (siteId === null) throw new Error(`PropertyFact: siteId unexpectedly null`);

        if (property.site?.id !== siteId) {
            throw new Error(`PropertyFact: property and entry are from different sites.`);
        }

        // Validate that this type of property can be used with this type of entry
        try {
            await tx.queryOne(C`
                MATCH (prop:${Property} {id: ${property.id}})
                MATCH (prop)-[:${Property.rel.APPLIES_TO_TYPE}]->(et:${EntryType} {id: ${data.entry?.type?.id}})
            `.RETURN({}));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new ValidationError("That Property cannot be applied to an Entry of that Entry Type.");
            } else {
                throw err;
            }
        }

        // If property mode is auto, PropertyFacts are not allowed - the property is instead computed automatically.
        if (property.mode === PropertyMode.Auto) {
            throw new ValidationError(
                `The ${property.name} property is an Automatic property so a value cannot be set explicitly.`,
            );
        }

        // TODO: validate uniqueness? (if required/enabled for the entrytype/property)

        // Additional validation based on the property type.
        const valueExpression = dbObject.valueExpression;
        if (property.type === PropertyType.Value) {
            // This property fact can have any value type.
            // TODO: Support constraints - validate that the value is of the correct type, or can be casted to it.
        } else {
            // This is an explicit IS_A, HAS_A, or RELATES_TO, or OTHER relationship
            // (and at this point we know it's not an "Auto" mode property)

            // There is a relationship FROM the current entry TO the entry with this id:
            const toEntryId = parseLookupExpressionToEntryId(valueExpression);
            // First, validate that this value is pointing to a real entry on the same site.
            await tx.queryOne(C`
                MATCH (e:${Entry} {id: ${toEntryId}})
                MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            `.RETURN({ "e.id": Field.VNID }));

            // For relationship properties, we also need a direct Entry-[:REL_TYPE]->Entry relationship created on the
            // graph, which makes ancestor lookups much more efficient, and also makes generally working with the graph
            // directly much nicer.
            const explicitRelType = directRelTypeForPropertyType(property.type as PropertyType);
            if (explicitRelType === null) {
                throw new Error("Internal error - unexpected property type");
            }
            const directRelCheck = await tx.query(C`
                MATCH (entry:${Entry} {id: ${data.entry?.id}})
                MATCH (entry)-[directRel:${explicitRelType}]->(toEntry:${Entry})
                WHERE id(directRel) = ${dbObject.directRelNeo4jId}
            `.RETURN({ "toEntry.id": Field.VNID }));
            if (directRelCheck.length === 0) {
                throw new ValidationError(
                    `PropertyFact ${dbObject.id} is missing the direct (Entry)-[${
                        getRelationshipType(explicitRelType)
                    }]->(Entry) relationship.`,
                );
            } else if (directRelCheck[0]["toEntry.id"] !== toEntryId) {
                throw new ValidationError(
                    `PropertyFact ${dbObject.id} has a direct relationship pointing to the wrong entry.`,
                );
            }
        }
    }
}

/**
 * Given a lookup expression that represents an Entry ID literal, get the entry ID.
 */
export function parseLookupExpressionToEntryId(valueExpression: string) {
    // We require the value (lookup expression) to be an entry literal, e.g. entry("_VNID")
    if (!valueExpression.startsWith(`entry("`) || !valueExpression.endsWith(`")`)) {
        throw new ValidationError(`Relationship property values must be of the format entry("entry-vnid")`);
    }
    // There is a relationship FROM the current entry TO the entry with this id:
    return VNID(valueExpression.slice(7, -2));
}
