//import * as check from "neolace/deps/computed-types.ts";
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
@VNodeType.declare
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

        // Depending on the type of "RelationshipType", this has a relationship to a target Entry:
        IS_A: { to: [Entry], cardinality: VNodeType.Rel.ToOneOrNone, },
        HAS_A: { to: [Entry], cardinality: VNodeType.Rel.ToOneOrNone, },
        DEPENDS_ON: { to: [Entry], cardinality: VNodeType.Rel.ToOneOrNone, },
        RELATES_TO: { to: [Entry], cardinality: VNodeType.Rel.ToOneOrNone, },
    }));

    static virtualProperties = this.hasVirtualProperties(() => ({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_REL_TYPE}]->(@target:${RelationshipType})`,
            target: RelationshipType,
        },
        fromEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)<-[:${Entry.rel.HAS_REL_FACT}]-(@target:${Entry})`,
            target: Entry,
        },
        toEntry: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_A}|${this.rel.HAS_A}|${this.rel.DEPENDS_ON}|${this.rel.RELATES_TO}]->(@target:${Entry})`,
            target: Entry,
        },
    }));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof Entry>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);

        // Load important data about this fact's relationships:
        const selfData = await tx.pullOne(RelationshipFact, self => self
            .fromEntry(e => e.type(et => et.id))
            .toEntry(e => e.type(et => et.id))
            .type(rt => rt.category.fromTypes(et => et.id).toTypes(et => et.id)),
            {key: dbObject.id},
        );

        const relType = selfData.type;
        // This check shouldn't be necessary, but Vertex+TypeScript currently think that it is. (TODO: fix so that
        // virtual props can be non-nullable)
        if (!relType) { throw new ValidationError("Internal error, RelationshipType is missing"); }

        // Make sure there is exactly one target Entry, and the relationship is of the correct type:
        const relChecks = await tx.query(C`
            MATCH (n:${RelationshipFact} {id: ${dbObject.id}})
            MATCH (n)-[r:${RelationshipFact.rel.IS_A}|${RelationshipFact.rel.HAS_A}|${RelationshipFact.rel.DEPENDS_ON}|${RelationshipFact.rel.RELATES_TO}]->(:${Entry})
        `.RETURN({r: Field.Relationship}));

        if (relChecks.length !== 1) {
            throw new ValidationError(`RelationshipFact should have exactly one relationship to a target entry type; found ${relChecks.length}`);
        }
        const actualRelTypeToTarget = relChecks[0].r.type;
        if (actualRelTypeToTarget !== relType.category) {
            throw new ValidationError(`RelationshipFact should have a relationship of type ${relType.category} to the target entry, not ${actualRelTypeToTarget}`);
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
    }

}
