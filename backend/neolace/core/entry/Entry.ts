import * as check from "neolace/deps/computed-types.ts";
import {
    DerivedProperty,
    VirtualPropType,
    C,
    VNodeType,
    VNodeTypeRef,
    Field,
} from "neolace/deps/vertex-framework.ts";

// Declare a forward reference, if needed:
export const TechDbEntryRef: typeof Entry = VNodeTypeRef("Entry");

import { Image } from "neolace/asset-library/Image.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";


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
        /** This entry is a child/subtype/variant/category of some other entry */
        IS_A: {
            to: [Entry],
            properties: {
                // More specific "type" of this relationship, according to the site's schema
                detailedRelType: Field.String,
            },
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        // HAS_ENTRIES: {
        //     to: [Entry],
        //     cardinality: VNodeType.Rel.ToMany,
        // },
    });

    static virtualProperties = this.hasVirtualProperties({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.IS_OF_TYPE}]->(@target:${EntryType})`,
            target: EntryType,
        },
        relatedImages: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Image})-[:${Image.rel.RELATES_TO}]->(:${this})-[:IS_A*0..10]->(@this)`,
            target: Image,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        id,
        numRelatedImages,
    });
}


/**
 * A property that provides the slugId without its site-specific prefix
 */
 export function id(): DerivedProperty<string> { return DerivedProperty.make(
    Entry,
    e => e.slugId,
    e => {
        // A normal VNode slugId is up to 32 chars long: "foo-bar-tribble-bat-wan-tresadfm"
        // To support multi-tenancy, we put a 3-5 character site ID (like "001") and a hyphen
        // at the start of the slugId. So "s-test" is stored as "XY6-s-test". This reverses
        // that prefix to return the site-specific slugId.
        const start = e.slugId.indexOf("-") + 1;
        if (start === 0) {
            throw new Error(`slugId ${e.slugId} is missing a site prefix.`);
        }
        return e.slugId.substr(start);
    },
);}

/**
 * A property that provides a simple string value stating what type this entry is (TechConcept, Process, etc.)
 */
export function numRelatedImages(): DerivedProperty<number> { return DerivedProperty.make(
    Entry,
    e => e.relatedImages(i => i),
    e => {
        return e.relatedImages.length;
    },
);}

// There are no actions to create a TechDbEntry because it is an abstract type.
