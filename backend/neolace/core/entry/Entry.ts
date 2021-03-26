import Joi from "@hapi/joi";
import {
    ShortIdProperty,
    DerivedProperty,
    VirtualPropType,
    C,
    VNodeType,
    VNodeTypeRef,
} from "vertex-framework";

// Declare a forward reference, if needed:
export const TechDbEntryRef: typeof Entry = VNodeTypeRef("Entry");

import { Image } from "../../asset-library/Image";
import { EntryType } from "../schema/EntryType";


/**
 * Abstract base class for an "entry"
 */
@VNodeType.declare
export class Entry extends VNodeType {
    static label = "Entry";
    static properties = {
        ...VNodeType.properties,
        // shortId: A short slug that identifies this entry
        // Ideally something very concise, so it doesn't need to be changed even if the article is renamed, and also so
        // that it can be used in other languages without being weird.
        // e.g. "p-geoeng-sas" for "stratospheric aerosol scattering" (p- means Process, t- means TechConcept/Thing, etc.)
        //
        // Note that shortIds can change but every shortId permanently points to the entry
        // for which is was first used. So shortIds are immutable but there can be several of them for one entry.
        shortId: ShortIdProperty,
        // The name of this entry
        // This does not need to be unique or include disambiguation - so just put "Drive", not "Drive (computer science)"
        name: Joi.string().required(),
        // Description: Short, rich text summary of the thing
        description: Joi.string().max(5_000),
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
                detailedRelType: Joi.string().required(),
            },
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        // HAS_ENTRIES: {
        //     to: [Entry],
        //     cardinality: VNodeType.Rel.ToMany,
        // },
    });

    static virtualProperties = VNodeType.hasVirtualProperties({
        type: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${Entry.rel.IS_OF_TYPE}]->(@target:${EntryType})`,
            target: EntryType,
        },
        relatedImages: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@target:${Image})-[:${Image.rel.RELATES_TO}]->(:${Entry})-[:IS_A*0..10]->(@this)`,
            target: Image,
        },
    });

    static derivedProperties = VNodeType.hasDerivedProperties({
        id,
        numRelatedImages,
    });
}


/**
 * A property that provides the shortId without its site-specific prefix
 */
 export function id(): DerivedProperty<string> { return DerivedProperty.make(
    Entry,
    e => e.shortId,
    e => {
        // A normal VNode shortId is up to 32 chars long: "foo-bar-tribble-bat-wan-tresadfm"
        // To support multi-tenancy, we put a 3-5 character site ID (like "001") and a hyphen
        // at the start of the shortId. So "s-test" is stored as "XY6-s-test". This reverses
        // that prefix to return the site-specific shortId.
        const start = e.shortId.indexOf("-") + 1;
        if (start === 0) {
            throw new Error(`shortId ${e.shortId} is missing a site prefix.`);
        }
        return e.shortId.substr(start);
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
