import * as check from "neolace/deps/computed-types.ts";
import {
    DerivedProperty,
    VirtualPropType,
    C,
    VNodeType,
    Field,
    RawVNode,
    WrappedTransaction,
    ValidationError,
} from "neolace/deps/vertex-framework.ts";

import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipFact } from "./RelationshipFact.ts";


/**
 * Abstract base class for an "entry"
 */
@VNodeType.declare
export class Entry extends VNodeType {
    static label = "Entry";
    static properties = {
        ...VNodeType.properties,
        // slugId: A short slug that identifies this entry
        // Ideally something very concise, so it doesn't need to be changed even if the article is renamed, and also so
        // that it can be used in other languages without being weird.
        // e.g. "p-geoeng-sas" for "stratospheric aerosol scattering" (p- means Process, t- means TechConcept/Thing, etc.)
        //
        // Note that slugIds can change but every slugId permanently points to the entry
        // for which is was first used. So slugIds are immutable but there can be several of them for one entry.
        slugId: Field.Slug,
        // The name of this entry
        // This does not need to be unique or include disambiguation - so just put "Drive", not "Drive (computer science)"
        name: Field.String,
        // Description: Short, rich text summary of the thing
        description: Field.String.Check(check.string.trim().max(5_000)),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** The type of this entry */
        IS_OF_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** This Entry has a relationship to another entry */
        HAS_REL_FACT: {
            to: [RelationshipFact],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        // HAS_ENTRIES: {
        //     to: [Entry],
        //     cardinality: VNodeType.Rel.ToMany,
        // },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_TYPE}]->(@target:${EntryType})`,
            target: EntryType,
        },
        /*
        relatedImages: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Image})-[:${Image.rel.RELATES_TO}]->(:${this})-[:IS_A*0..10]->(@this)`,
            target: Image,
        },
        */
    }));

    static derivedProperties = this.hasDerivedProperties({
        id,
        //numRelatedImages,
    });

    static async validate(dbObject: RawVNode<typeof Entry>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
        // Check that the slugId is prefixed with the site code.
        const chain = await tx.pullOne(Entry, e => e.type(t => t.site(s => s.siteCode)));
        const siteCode = chain.type?.site?.siteCode;
        if (!siteCode) {
            throw new ValidationError("Entry is unexpectedly not linked to a site with a sitecode.");
        }
        if (dbObject.slugId.substr(0, 5) !== siteCode) {
            throw new ValidationError("Entry's slugId does not start with the site code.");
        }
    }

}


/**
 * A property that provides the slugId without its site-specific prefix
 * See arch-decisions/007-sites-multitenancy for details.
 */
 export function id(): DerivedProperty<string> { return DerivedProperty.make(
    Entry,
    e => e.slugId,
    e => {
        return e.slugId.substr(5);
    },
);}

/**
 * A property that provides a simple string value stating what type this entry is (TechConcept, Process, etc.)
 */
/*export function numRelatedImages(): DerivedProperty<number> { return DerivedProperty.make(
    Entry,
    e => e.relatedImages(i => i),
    e => {
        return e.relatedImages.length;
    },
);}*/

// There are no actions to create a TechDbEntry because it is an abstract type.
