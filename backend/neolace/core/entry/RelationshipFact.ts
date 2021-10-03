//import * as check from "neolace/deps/computed-types.ts";
import { RelationshipCategory } from "neolace/deps/neolace-api.ts";
import {
    VirtualPropType,
    C,
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";

import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";
import { Entry } from "./Entry.ts";


/**
 * Base class for a relationship fact, which defines a relationship between two entries
 */
export class RelationshipFact extends VNodeType {
    static label = "RelFact";
    static properties = {
        ...VNodeType.properties,
        weight: Field.NullOr.Int,
        // slot: Field.NullOr.String,
        // quantity: Field.NullOr.Int.Check(check.number.min(0)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo(() => ({
        /** The type of this fact */
        IS_OF_REL_TYPE: { to: [RelationshipType], cardinality: VNodeType.Rel.ToOneRequired, },
        /**
         * Where this fact comes from / what entry "owns" this fact.
         * e.g. a DataTable Entry may be the source of hundreds of facts about other entries.
         * Or in the future, a source might be natural language processing of article text.
         */
        HAS_FACT_SOURCE: { to: [Entry], cardinality: VNodeType.Rel.ToOneRequired, },

        // There will be a REL_FACT relationship *From* an Entry to this RelationshipFact,
        // and there is a REL_FACT relationship *To* an Entry from this RelationshipFact:
        REL_FACT: { to: [Entry], cardinality: VNodeType.Rel.ToOneRequired, },
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_REL_TYPE}]->(@target:${RelationshipType})`,
            target: RelationshipType,
        },
        fromEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:${Entry.rel.REL_FACT}]-(@target:${Entry})`,
            target: Entry,
        },
        toEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.REL_FACT}]->(@target:${Entry})`,
            target: Entry,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof this>, tx: WrappedTransaction): Promise<void> {
        // Load important data about this fact's relationships:
        const selfData = await tx.pullOne(RelationshipFact, self => self
            .fromEntry(e => e.id.type(et => et.id))
            .toEntry(e => e.id.type(et => et.id))
            .type(rt => rt.category.fromTypes(et => et.id).toTypes(et => et.id)),
            {key: dbObject.id},
        );

        const relType = selfData.type;
        // This check shouldn't be necessary, but Vertex+TypeScript currently think that it is. (TODO: fix so that
        // virtual props can be non-nullable)
        if (!relType) { throw new ValidationError("Internal error, RelationshipType is missing"); }

        // HAS_PROPERTY relationships are not allowed using RelationshipFact - use PropertyFact instead
        if (relType.category === RelationshipCategory.HAS_PROPERTY) {
            throw new ValidationError("Use PropertyFact, not RelationshipFact for HAS_PROPERTY relationships.");
        }

        // Make sure there are exactly two REL_FACT relationships (one from and one to):
        const relChecks = await tx.query(C`
            MATCH (n:${RelationshipFact} {id: ${dbObject.id}})
            MATCH (n)-[r:${RelationshipFact.rel.REL_FACT}]-(:${Entry})
        `.RETURN({r: Field.Relationship}));
        if (relChecks.length !== 2) {
            throw new ValidationError(`RelationshipFact should have exactly one from relationship and one to relationship with Entry VNodes; found ${relChecks.length}`);
        }

        // Make sure that the entry types this relationship involves are permitted by the RelationshipType
        if (!selfData.fromEntry?.type?.id) { throw new ValidationError("RelationshipFact fromEntry is missing"); }
        if (!relType.fromTypes.map(et => et.id).includes(selfData.fromEntry?.type?.id)) {
            throw new ValidationError(`RelationshipType does not permit a relationship from an Entry of that EntryType`);
        }
        if (!selfData.toEntry?.type?.id) { throw new ValidationError("RelationshipFact toEntry is missing"); }
        if (!relType.toTypes.map(et => et.id).includes(selfData.toEntry?.type?.id)) {
            throw new ValidationError(`RelationshipType does not permit a relationship to an Entry of that EntryType`);
        }

        // Special case: for IS_A relationship types, we also need a direct Entry-[:IS_A]->Entry relationship created on
        // the graph, which makes ancestor lookups much more efficient.
        if (relType.category === RelationshipCategory.IS_A) {
            const directRelCheck = await tx.query(C`
                MATCH (fromEntry:${Entry} {id: ${selfData.fromEntry.id}})
                MATCH (toEntry:${Entry} {id: ${selfData.toEntry.id}})
                MATCH (fromEntry)-[:${Entry.rel.IS_A} {relFactId: ${dbObject.id}}]->(toEntry)
            `.RETURN({}));
            if (directRelCheck.length !== 1) {
                throw new ValidationError(`RelationshipFact ${dbObject.id} is an IS_A relationship but the direct (Entry)-[IS_A]->(Entry) relationship is missing.`);
            }
        }
    }

}
