import { VNID, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, RelationshipCategory } from "neolace/deps/neolace-api.ts";

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
                        ids.techConcept,
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
};
