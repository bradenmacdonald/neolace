import { VNID, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, PropertyType, PropertyMode } from "neolace/deps/neolace-api.ts";

 // IDs used in the TechNotes schema:
const ids = {
    // Entry types:
    image: VNID("_TNIMAGE"),
    technotesMetaPage: VNID("_TNMETA"),
    techConcept: VNID("_TECHCONCEPT"),
    // Relationship Properties:
    propTypeOf: VNID("_TNTYPEOF"),  // An entry is a sub-type of another entry
    propHasTypes: VNID("_TNHASTYPES"),  // Inverse of "is a"
    propHasPart: VNID("_TNHASPART"),  // A TechConcept has a specific part
    propUsedIn: VNID("_TNUSEDIN"),  // A TechConcept is used in (as a part of) another TechConcept
    propHasHeroImage: VNID("_TNHEROIMG"),  // An entry has a hero image
    propImgRelatesTo: VNID("_TNIMGRELTO"),  // An image relates to another entry
    propRelatedImages: VNID("_TNRELIMG"),  // Images that relate to this entry
    // Value properties:
    propAlsoKnownAs: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    propContentSource: VNID("_2QK8KQVZfHogH5ofrksCba"),
    propCreator: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    propDiameter: VNID("_3JjzqBJ9YLtRGuesdK0lWb"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propLength: VNID("_1PPhmzTVqhSwjbyZtAsIBm"),
    propLicense: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
    propPhysicalDimension: VNID("_1shoq3dCEZa9oZVbusxdLq"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    // propWikidataPropertyId: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    propWordNetILI: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
};
export const schemaIds = ids;
 
// Import the schema:
export const schema: SiteSchemaData = {
    entryTypes: {
        // Image:
        [ids.image]: {
            id: ids.image,
            name: "Image",
            description: "An Image",
            friendlyIdPrefix: "img-",
            enabledFeatures: {
                Image: {},
            },
        },
        // TechNotes meta page (e.g. About TechNotes, TechNotes Team, TechNotes Terms of Use, etc.):
        [ids.technotesMetaPage]: {
            id: ids.technotesMetaPage,
            name: "Meta Page",
            description: "A page with information about TechNotes.",
            friendlyIdPrefix: null,
            enabledFeatures: {
                Article: {},
                HeroImage: {lookupExpression: `this.get(prop=[[/prop/${ids.propHasHeroImage}]])`},
            },
        },
        // Tech Concept:
        [ids.techConcept]: {
            id: ids.techConcept,
            name: "TechConcept",
            description: "A TechConcept is a description of a technical thing.",
            friendlyIdPrefix: "tc-",
            enabledFeatures: {
                Article: {},
                HeroImage: {lookupExpression: `this.get(prop=[[/prop/${ids.propHasHeroImage}]])`},
            },
        },
    },
    properties: {
        // A TechConcept IS A [other Tech Concept]
        [ids.propTypeOf]: {
            id: ids.propTypeOf,
            name: "Type of",
            type: PropertyType.RelIsA,
            appliesTo: [{entryType: ids.techConcept}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `This tech concept is a subtype of another tech concept.`,
            importance: 0,
            standardURL: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
        },
        [ids.propHasTypes]: {
            id: ids.propHasTypes,
            name: "Has types",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/${ids.propTypeOf}]])`,
            descriptionMD: `Tech concepts that are sub-types of this tech concept.`,
            importance: 1,
            // standardURL: "?",
            // wikidataPID: "?",
        },
        // A TechConcept HAS PART [other Tech Concept]
        [ids.propHasPart]: {
            id: ids.propHasPart,
            name: "Has part",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Lists known parts of this tech concept.`,
            importance: 4,
            // The HAS PART relationship uses the "slots" feature
            enableSlots: true,
        },
        // A TechConcept IS USED IN [other Tech Concept]
        [ids.propUsedIn]: {
            id: ids.propUsedIn,
            name: "Used in",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/${ids.propHasPart}]])`,
            descriptionMD: `Lists TechConcepts that use this one as a part.`,
            importance: 10,
        },
        // An entry HAS HERO IMAGE [image]
        [ids.propHasHeroImage]: {
            id: ids.propHasHeroImage,
            name: "Hero Image",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.technotesMetaPage}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Main image displayed on this entry`,
            importance: 21,
        },
        // An image RELATES TO [a Tech Concept]
        [ids.propImgRelatesTo]: {
            id: ids.propImgRelatesTo,
            name: "Relates to",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.image}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Lists TechNotes entries that this images relates to.`,
            importance: 8,
        },
        // Related images
        [ids.propRelatedImages]: {
            id: ids.propRelatedImages,
            name: "Related images",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=[[/prop/${ids.propHasPart}]])`,
            descriptionMD: `Images related to this tech concept.`,
            importance: 10,
        },

        // Property: Also known as
        [ids.propAlsoKnownAs]: {
            id: ids.propAlsoKnownAs,
            name: "Also known as",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `Other names for this entry`,
            importance: 1,
        },
        // Property: External Identifier
        [ids.propExternalId]: {
            id: ids.propExternalId,
            name: "External Identifier",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `Identifier for an entry in an external system, outside of TechNotes.`,
            importance: 30,
        },
        // Property: Wikidata ID
        [ids.propWikidataId]: {
            id: ids.propWikidataId,
            name: "Wikidata QID",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `ID of this entry on Wikidata, the free knowledge base that anyone can edit.`,
            importance: 15,
            displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",
            // AKA "Wikidata item ID", "WDQID"
            // Wikidata ID "Q43649390"
            isA: [ids.propExternalId],
        },
        // Property: WordNet Interlingual Index
        [ids.propWordNetILI]: {
            id: ids.propWordNetILI,
            name: "Interlingual Index",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `Language-neutral identifier to look up this concept in a WordNet, like Princeton WordNet (for English)`,
            editNoteMD: "Specifying this helps Natural Language Processing tools understand this content.",
            // See https://stackoverflow.com/a/33348009/1057326 for details on these various WordNet identifiers
            importance: 15,
            isA: [ids.propExternalId],
            // See https://github.com/jmccrae/wordnet-angular/blob/c3c41778e333b958ff8240288d23bb5e0cba1c1d/src/main.rs#L637-L654
            // for the Princeton WordNet Angular URL formats
            displayAs: "[{value}](http://wordnet-rdf.princeton.edu/ili/{value})",
        },
        // Property: Creator
        [ids.propCreator]: {
            id: ids.propCreator,
            name: "Creator",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.image}],
            descriptionMD: `The creator of this work, e.g. the designer or inventor or photographer or author.`,
            importance: 4,
        },
        // Property: License
        [ids.propLicense]: {
            id: ids.propLicense,
            name: "License",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.image}],
            descriptionMD: `The copyright license(s) under which this work can be used`,
            importance: 15,
            // AKA ["copyright license", "content license"]
        },
        // Property: Content Source
        [ids.propContentSource]: {
            id: ids.propContentSource,
            name: "Source",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.image}],
            descriptionMD: `The source where this work was published.`,
            importance: 10,
        },
        // Property: Physical dimension
        [ids.propPhysicalDimension]: {
            id: ids.propPhysicalDimension,
            name: "Physical dimension",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `A physical dimension is a measurement or specification of some length or size, such as the width, height, length, diameter, or radius of an object.`,
            importance: 30,
            // propWordNetILI "i63761"
        },
        // Property: Length
        [ids.propLength]: {
            id: ids.propLength,
            name: "Length",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `The length is a measurement or specification of the size of an object, usually as measured along its longest major axis.`,
            importance: 15,
            isA: [ids.propPhysicalDimension],
            // [ids.propWikidataPropertyId]: {valueExpr: `"P2043"`},
            // [ids.propWordNetILI]: { valueExpr: `"i63940"` },
        },
        // Property: Diameter
        [ids.propDiameter]: {
            id: ids.propDiameter,
            name: "Diameter",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}],
            descriptionMD: `The diameter is a measurement or specification of the distance across a circular or spherical shape (specifically, the length of a straight line passing through the center and connecting two points on the circumference).`,
            importance: 15,
            // [ids.propWikidataPropertyId]: {valueExpr: `"P2386"`},
            // [ids.propWordNetILI]: { valueExpr: `"i63810"` },
        },
    },
};
