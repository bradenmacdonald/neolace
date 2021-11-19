import { VNID, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, RelationshipCategory, PropertyType, PropertyMode } from "neolace/deps/neolace-api.ts";

 // IDs used in the TechNotes schema:
const ids = {
    // Entry types:
    techConcept: VNID("_TECHCONCEPT"),
    image: VNID("_TNIMAGE"),
    property: VNID("_TNPROP"),
    // Entry type simple properties:
    propertyPropTypeOf: VNID("_TNPROPPROPTYPEOF"),  // The "Property" entry type has a Simple Property that shows it is a type of some other Property
    propertyPropTypes: VNID("_TNPROPPROPTYPES"),  // The "Property" entry type has a Simple Property that shows its sub-types
    techConceptPropTypeOf: VNID("_TCTYPEOF"),
    techConceptPropTypes: VNID("_TCTYPES"),
    techConceptPropParts: VNID("_TCPARTS"),
    techConceptPropUsedIn: VNID("_TCUSEDIN"),
    techConceptPropRelatedImages: VNID("_TCPROPRELIMG"),
    imgPropRelatedTo: VNID("_TNIMGPROPRELTO"),
    // Relationships:
    techConceptIsA: VNID("_TCISA"),  // A TechConcept IS A [other Tech Concept]
    techConceptHasPart: VNID("_TCHASPART"),  // A TechConcept HAS PART [other Tech Concept]
    hasHeroImage: VNID("_TNHASHEROIMG"),  // An Entry HAS A hero [image]
    imgRelatedTo: VNID("_TNIMGRELTO"),  // An image entry IS RELATED TO [something]
    propIsAProp: VNID("_TNPROPISPROP"),  // A property is a sub-type of another property
    // Properties:
    propTypeOf: VNID("_TNTYPEOF"),  // An entry is a sub-type of another entry
    propHasTypes: VNID("_TNHASTYPES"),  // Inverse of "is a"
    propHasPart: VNID("_TNHASPART"),  // A TechConcept has a specific part
    propUsedIn: VNID("_TNUSEDIN"),  // A TechConcept is used in (as a part of) another TechConcept
    propImgRelatesTo: VNID("_TNIMGRELTO"),  // An image relates to another entry
    propRelatedImages: VNID("_TNRELIMG"),  // Images that relate to this entry
};
export const schemaIds = ids;
 
// Import the schema:
export const schema: SiteSchemaData = {
    entryTypes: {
        // Properties:
        [ids.property]: {
            id: ids.property,
            name: "Property",
            description: "A Property",
            friendlyIdPrefix: "p-",
            simplePropValues: {
                [ids.propertyPropTypeOf]: {
                    id: ids.propertyPropTypeOf,
                    importance: 1,
                    label: "Type of",
                    valueExpression: `this.related(via=RT[${ids.propIsAProp}], direction="from")`,
                    note: "",
                },
                [ids.propertyPropTypes]: {
                    id: ids.propertyPropTypes,
                    importance: 2,
                    label: "Types",
                    valueExpression: `this.related(via=RT[${ids.propIsAProp}], direction="to")`,
                    note: "",
                },
            },
            enabledFeatures: {
                UseAsProperty: {
                    appliesToEntryTypes: [
                        ids.property,
                        ids.techConcept,
                        ids.image,
                    ],
                },
            },
        },
        // Image:
        [ids.image]: {
            id: ids.image,
            name: "Image",
            description: "An Image",
            friendlyIdPrefix: "img-",
            simplePropValues: {
                [ids.imgPropRelatedTo]: {
                    id: ids.imgPropRelatedTo,
                    importance: 5,
                    label: "Related to",
                    valueExpression: `this.related(via=RT[${ids.imgRelatedTo}], direction="from")`,
                    note: "",
                },
            },
            enabledFeatures: {
                Image: {},
            },
        },
        // Tech Concept:
        [ids.techConcept]: {
            id: ids.techConcept,
            name: "TechConcept",
            description: "A TechConcept is a description of a technical thing.",
            friendlyIdPrefix: "tc-",
            simplePropValues: {
                [ids.techConceptPropTypeOf]: {
                    id: ids.techConceptPropTypeOf,
                    importance: 1,
                    label: "Type of",
                    valueExpression: `this.related(via=RT[${ids.techConceptIsA}], direction="from")`,
                    note: "",
                },
                [ids.techConceptPropTypes]: {
                    id: ids.techConceptPropTypes,
                    importance: 2,
                    label: "Types",
                    valueExpression: `this.related(via=RT[${ids.techConceptIsA}], direction="to")`,
                    note: "",
                },
                [ids.techConceptPropParts]: {
                    id: ids.techConceptPropParts,
                    importance: 5,
                    label: "Has parts",
                    valueExpression: `this.related(via=RT[${ids.techConceptHasPart}], direction="from")`,
                    note: "",
                },
                [ids.techConceptPropUsedIn]: {
                    id: ids.techConceptPropUsedIn,
                    importance: 6,
                    label: "Used in",
                    valueExpression: `this.related(via=RT[${ids.techConceptHasPart}], direction="to")`,
                    note: "",
                },
                [ids.techConceptPropRelatedImages]: {
                    id: ids.techConceptPropRelatedImages,
                    importance: 10,
                    label: "Related Images",
                    valueExpression: `this.related(via=RT[${ids.imgRelatedTo}], direction="to")`,
                    note: "",
                },
            },
            enabledFeatures: {
                Article: {},
                HeroImage: {lookupExpression: `this.related(via=RT[${ids.hasHeroImage}], direction="from")`},
            },
        },
    },
    relationshipTypes: {
        [ids.techConceptIsA]: {
            // A TechConcept IS A [other Tech Concept]
            id: ids.techConceptIsA,
            nameForward: "is a",
            nameReverse: "has type",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [ids.techConcept],
            toEntryTypes: [ids.techConcept],
        },
        [ids.techConceptHasPart]: {
            // A TechConcept HAS PART [other Tech Concept]
            id: ids.techConceptHasPart,
            nameForward: "has part",
            nameReverse: "used in",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [ids.techConcept],
            toEntryTypes: [ids.techConcept],
        },
        [ids.hasHeroImage]: {
            // An entry HAS A hero [image]
            id: ids.hasHeroImage,
            nameForward: "has hero image",
            nameReverse: "used as hero image for",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [ids.techConcept],
            toEntryTypes: [ids.image],
        },
        [ids.imgRelatedTo]: {
            // An image is related to __________
            id: ids.imgRelatedTo,
            nameForward: "related to",
            nameReverse: "related images",
            category: RelationshipCategory.RELATES_TO,
            description: null,
            fromEntryTypes: [ids.image],
            toEntryTypes: [ids.techConcept],
        },
        [ids.propIsAProp]: {
            // An property is a sub-type of another property
            id: ids.propIsAProp,
            nameForward: "is a type of",
            nameReverse: "has type",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [ids.property],
            toEntryTypes: [ids.property],
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
            name: "Has type",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/${ids.propTypeOf}])`,
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
        },
        // A TechConcept IS USED IN [other Tech Concept]
        [ids.propUsedIn]: {
            id: ids.propUsedIn,
            name: "Used in",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/${ids.propHasPart}])`,
            descriptionMD: `Lists TechConcepts that use this one as a part.`,
            importance: 10,
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
            default: `this.andDescendants().reverseProp(prop=[/prop/${ids.propHasPart}])`,
            descriptionMD: `Images related to this tech concept.`,
            importance: 10,
        },

        /*
        // Property: Also known as
        ...createEntry({
            id: ids.propAlsoKnownAs,
            name: "Also known as",
            friendlyId: "p-aka",
            type: schemaIds.property,
            description: "Other names for this entry",
            features: [
                {featureType: "UseAsProperty", importance: 1},
            ],
        }),
        // Property: External Identifier
        ...createEntry({
            id: ids.propExternalId,
            name: "External Identifier",
            friendlyId: "p-ext-id",
            type: schemaIds.property,
            description: "Identifier for an entry in an external system, outside of TechNotes.",
            features: [
                {featureType: "UseAsProperty", importance: 30},
            ],
        }),
        // Property: Wikidata ID
        ...createEntry({
            id: ids.propWikidataId,
            name: "Wikidata QID",
            friendlyId: "p-wikidata-id",
            type: schemaIds.property,
            description: "ID of this entry on Wikidata, the free knowledge base that anyone can edit.",
            features: [
                {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",},
            ],
            rels: [
                {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
            ],
            props: {
                [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["Wikidata item ID", "WDQID"]) },
                [ids.propWikidataId]: { valueExpr: `"Q43649390"` },
            },
        }),
        // Property: Wikidata Property ID
        ...createEntry({
            id: ids.propWikidataPropertyId,
            name: "Wikidata Property ID",
            friendlyId: "p-wikidata-pid",
            type: schemaIds.property,
            description: "ID of this property entry on Wikidata, the free knowledge base that anyone can edit.",
            features: [
                {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](https://www.wikidata.org/wiki/Property:{value})",},
            ],
            rels: [
                {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
            ],
        }),
        // Property: WordNet Interlingual Index
        ...createEntry({
            id: ids.propWordNetILI,
            name: "Interlingual Index",
            friendlyId: "p-ili",
            type: schemaIds.property,
            description: "Language-neutral identifier to look up this concept in a WordNet, like Princeton WordNet (for English)",
            // See https://stackoverflow.com/a/33348009/1057326 for details on these various WordNet identifiers
            features: [
                // See https://github.com/jmccrae/wordnet-angular/blob/c3c41778e333b958ff8240288d23bb5e0cba1c1d/src/main.rs#L637-L654
                // for the Princeton WordNet Angular URL formats
                {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/ili/{value})",},
            ],
            rels: [
                {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
            ],
            props: {
                [ids.propWikidataPropertyId]: { valueExpr: `"P8814"` },
            },
        }),
        // Property: WordNet 3.1 Synset ID
        // For now we're not using this, in favor of the Interlingual Index
        // ...createEntry({
        //     id: ids.propWordNet31SynsetId,
        //     name: "WordNet 3.1 Synset ID",
        //     friendlyId: "p-wordnet31-synset-id",
        //     type: schemaIds.property,
        //     description: "Identifier for this entry in Princeton's WordNet, the lexical database for English.",
        //     features: [
        //         {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/id/{value})",},
        //     ],
        //     rels: [
        //         {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        //     ],
        //     props: {
        //         [ids.propWikidataPropertyId]: { valueExpr: `"P8814"` },
        //     },
        // }),
        // Property: Creator
        ...createEntry({
            id: ids.propCreator,
            name: "Creator",
            friendlyId: "p-creator",
            type: schemaIds.property,
            description: "The creator of this work, e.g. the designer or inventor or photographer or author.",
            features: [
                {featureType: "UseAsProperty", importance: 4},
            ],
            props: {
                [ids.propWikidataPropertyId]: {valueExpr: `"P170"`},
            },
        }),
        // Property: License
        ...createEntry({
            id: ids.propLicense,
            name: "License",
            friendlyId: "p-lic",
            type: schemaIds.property,
            description: "The copyright license(s) under which this work can be used",
            features: [
                {featureType: "UseAsProperty", importance: 15},
            ],
            props: {
                [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["copyright license", "content license"]) },
                [ids.propWikidataPropertyId]: {valueExpr: `"P275"`},
            },
        }),
        // Property: Content Source
        ...createEntry({
            id: ids.propContentSource,
            name: "Source",
            friendlyId: "p-content-source",
            type: schemaIds.property,
            description: "The source where this work was published.",
            features: [
                {featureType: "UseAsProperty", importance: 10},
            ],
            props: {},
        }),
        // Property: Physical dimension
        ...createEntry({
            id: ids.propPhysicalDimension,
            name: "Physical dimension",
            friendlyId: "p-phys-dim",
            type: schemaIds.property,
            description: `A physical dimension is a measurement or specification of some length or size, such as the width, height, length, diameter, or radius of an object.`,
            features: [
                {featureType: "UseAsProperty", importance: 30},
            ],
            props: {
                [ids.propWordNetILI]: { valueExpr: `"i63761"` },
            },
        }),
        // Property: Length
        ...createEntry({
            id: ids.propLength,
            name: "Length",
            friendlyId: "p-length",
            type: schemaIds.property,
            description: `The length is a measurement or specification of the size of an object, usually as measured along its longest major axis.`,
            features: [
                {featureType: "UseAsProperty", importance: 15},
            ],
            rels: [
                {type: schemaIds.propIsAProp, to: ids.propPhysicalDimension},  // This is a type of physical dimension
            ],
            props: {
                [ids.propWikidataPropertyId]: {valueExpr: `"P2043"`},
                [ids.propWordNetILI]: { valueExpr: `"i63940"` },
            },
        }),
        // Property: Diameter
        ...createEntry({
            id: ids.propDiameter,
            name: "Diameter",
            friendlyId: "p-diameter",
            type: schemaIds.property,
            description: `The diameter is a measurement or specification of the distance across a circular or spherical shape (specifically, the length of a straight line passing through the center and connecting two points on the circumference).`,
            features: [
                {featureType: "UseAsProperty", importance: 15},
            ],
            rels: [
                {type: schemaIds.propIsAProp, to: ids.propPhysicalDimension},  // This is a type of physical dimension
            ],
            props: {
                [ids.propWikidataPropertyId]: {valueExpr: `"P2386"`},
                [ids.propWordNetILI]: { valueExpr: `"i63810"` },
            },
        }),

        */
    },
};
