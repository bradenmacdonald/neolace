/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    Field,
    getRelationshipType,
    ValidationError,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { PropertyMode, PropertyType } from "neolace/deps/neolace-sdk.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "../schema/EntryType.ts";
import { Property } from "../schema/Property.ts";
import { Entry } from "./Entry.ts";
import { environment } from "../../app/config.ts";

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

    static override async validateExt(vnodeIds: VNID[], tx: WrappedTransaction): Promise<void> {
        // This whole function is just extra assertions to help catch bugs in our code (specifically in the core Actions
        // which modify properties or relationships). We definitely want it on in dev and test modes, but in production
        // it is not as useful, and disabling it speeds bulk import up significantly.
        if (environment === "production") {
            return;
        }
        // Start validation, making sure that this PropertyFact's Entry, Property, and EntryType are from the same site:
        // Note: we have carefully written and tested this query in a way that its performance doesn't get too much
        // worse as the size of the database grows, which can otherwise happen.
        const rows = await tx.query(C`
            MATCH (pf:${PropertyFact})
                WHERE pf.id IN ${vnodeIds}
            CALL {
                WITH pf
                MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site})
                RETURN entry, et, site LIMIT 1
            }
            MATCH (pf)-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
                WHERE exists( (property)-[:${Property.rel.APPLIES_TO_TYPE}]->(et) )
                AND   exists( (property)-[:${Property.rel.FOR_SITE}]->(site) )
        `.RETURN({
            "property.name": Field.String,
            "property.mode": Field.String,
            "property.type": Field.String,
            "pf.valueExpression": Field.String,
            "pf.directRelNeo4jId": Field.BigInt,
            "entry.id": Field.VNID,
        }));
        if (rows.length !== vnodeIds.length) {
            throw new Error(
                "PropertyFact validation failed - perhaps Property and EntryType are missing or from different sites?",
            );
        }

        const relationshipsToValidate: {
            fromEntryId: VNID;
            toEntryId: VNID;
            directRelType: string;
            directRelNeo4jId: bigint;
        }[] = [];

        for (const data of rows) {
            // If property mode is auto, PropertyFacts are not allowed - the property is instead computed automatically.
            if (data["property.mode"] === PropertyMode.Auto) {
                throw new ValidationError(
                    `The ${
                        data["property.name"]
                    } property is an Automatic property so a value cannot be set explicitly.`,
                );
            }

            // TODO: validate uniqueness? (if required/enabled for the entrytype/property)

            // Additional validation based on the property type.
            if (data["property.type"] === PropertyType.RelIsA || data["property.type"] === PropertyType.RelOther) {
                // This is an explicit IS_A or RELATES_TO relationship
                // (and at this point we know it's not an "Auto" mode property)
                // There is a relationship FROM the PropertyFact's entry TO the entry with this id:
                const toEntryId = parseLookupExpressionToEntryId(data["pf.valueExpression"]);
                const directRelType = directRelTypeForPropertyType(data["property.type"] as PropertyType);
                if (directRelType === null) {
                    throw new Error("This shouldn't happen - direct rel type is null for a relationship property");
                }
                relationshipsToValidate.push({
                    fromEntryId: data["entry.id"],
                    toEntryId,
                    directRelType: getRelationshipType(directRelType),
                    directRelNeo4jId: data["pf.directRelNeo4jId"],
                });
            }
        }

        if (relationshipsToValidate.length > 0) {
            // Validate that relationships point to entries on the same site:
            const relCheck = await tx.query(C`
                UNWIND ${relationshipsToValidate} as rel
                MATCH (fromE:${Entry} {id: rel.fromEntryId})
                MATCH (fromE)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site})
                MATCH (toE:${Entry} {id: rel.toEntryId})
                   WHERE exists( (toE)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site) )

                // Also validate that there is a direct relationship between fromEntry and toEntry:
                // (For relationship properties, we also need a direct Entry-[:IS_A/RELATES_TO]->Entry relationship
                // created on the graph, which makes ancestor lookups much more efficient, and also makes generally
                // working with the graph directly much nicer.)
                MATCH (fromE)-[directRel:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}]->(toE)
                   WHERE id(directRel) = rel.directRelNeo4jId AND type(directRel) = rel.directRelType
            `.RETURN({}));
            // This query will return one row for every relationship that MATCHed all of the above criteria, or otherwise fewer rows.
            if (relCheck.length !== relationshipsToValidate.length) {
                throw new ValidationError("Found an invalid relationship during PropertyFact validation.");
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
