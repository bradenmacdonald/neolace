import { VNID, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, RelationshipCategory, PropertyType, PropertyMode, PropertyCardinality } from "neolace/deps/neolace-api.ts";

// Type helper to ensure that the schema is a valid SiteSchemaData without
// collapsing the type down to just "SiteSchemaData"
function ValidateSiteSchema<X extends SiteSchemaData>(x: X): X { return x; }
 
// Import the schema:
export const schema = ValidateSiteSchema({
    entryTypes: {
        "_ETDIVISION": {
            id: VNID("_ETDIVISION"),
            name: "Division",
            description: "A division (also called Phylum outside of botany) is the main taxonomic classification within the Plant Kingdom.",
            friendlyIdPrefix: "d-",
            simplePropValues: {
                "_CFDivisionClasses": {id: VNID("_CFDivisionClasses"), label: "Classes", importance: 6, valueExpression: `this.related(via=RT[_CisD])`, note: ""},
            },
            enabledFeatures: {},
        },
        "_ETCLASS": {
            id: VNID("_ETCLASS"),
            name: "Class",
            description: "A class is a level of taxonomic classification between Division/Phylum and Order.",
            friendlyIdPrefix: "c-",
            simplePropValues: {
                "_CFClassTaxonomy": {id: VNID("_CFClassTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                "_CFClassOrders": {id: VNID("_CFClassOrders"), label: "Orders", importance: 6, valueExpression: `this.related(via=RT[_OisC])`, note: ""},
                "_CFClassParts": {id: VNID("_CFClassParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
            },
            enabledFeatures: {},
        },
        "_ETORDER": {
            id: VNID("_ETORDER"),
            name: "Order",
            description: "An order is a level of taxonomic classification between Class and Family.",
            friendlyIdPrefix: "o-",
            simplePropValues: {
                "_CFOrderTaxonomy": {id: VNID("_CFOrderTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                "_CFOrderFamilies": {id: VNID("_CFOrderFamilies"), label: "Families", importance: 6, valueExpression: `this.related(via=RT[_FisO])`, note: ""},
                "_CFOrderParts": {id: VNID("_CFOrderParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
            },
            enabledFeatures: {},
        },
        "_ETFAMILY": {
            id: VNID("_ETFAMILY"),
            name: "Family",
            description: "A family is a level of taxonomic classification between Order and Genus.",
            friendlyIdPrefix: "f-",
            simplePropValues: {
                "_CFFamilyTaxonomy": {id: VNID("_CFFamilyTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                "_CFFamilyGenera": {id: VNID("_CFFamilyGenera"), label: "Genera", importance: 6, valueExpression: `this.related(via=RT[_GisF])`, note: ""},
                "_CFFamilyParts": {id: VNID("_CFFamilyParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
            },
            enabledFeatures: {},
        },
        "_ETGENUS": {
            id: VNID("_ETGENUS"),
            name: "Genus",
            description: "A genus is a level of taxonomic classification between Family and Species.",
            friendlyIdPrefix: "g-",
            simplePropValues: {
                "_CFGenusTaxonomy": {id: VNID("_CFGenusTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                "_CFGenusSpecies": {id: VNID("_CFGenusSpecies"), label: "Species", importance: 6, valueExpression: `this.related(via=RT[_SisG])`, note: ""},
                "_CFGenusParts": {id: VNID("_CFGenusParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
            },
            enabledFeatures: {},
        },
        "_ETSPECIES": {
            id: VNID("_ETSPECIES"),
            name: "Species",
            description: "A species is a basic unit of classifying life.",
            friendlyIdPrefix: "s-",
            simplePropValues: {
                "_CFSpeciesTaxonomy": {id: VNID("_CFSpeciesTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                "_CFSpeciesParts": {id: VNID("_CFSpeciesParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                "_CFSpeciesRelImg": {id: VNID("_CFSpeciesRelImg"), label: "Related Images", importance: 15, valueExpression: `this.related(via=RT[_IRelTo], direction="to")`, note: ""},
            },
            enabledFeatures: {
                Article: {},
                HeroImage: {
                    lookupExpression: `this.related(via=RT[_HasHeroImage], direction="from")`,
                },
            },
        },
        "_ETPLANTPART": {
            id: VNID("_ETPLANTPART"),
            name: "Plant Part",
            description: "Describes a part of a plant.",
            friendlyIdPrefix: "pp-",
            simplePropValues: {
                "_CFPartTypeOf": {id: VNID("_CFPartTypeOf"), label: "Type of", importance: 1, valueExpression: `this.related(via=RT[_PARTisPART], direction="from")`, note: ""},
                "_CFPartTypes": {id: VNID("_CFPartTypes"), label: "Types", importance: 2, valueExpression: `this.related(via=RT[_PARTisPART], direction="to")`, note: ""},
                "_CFPartsFoundIn": {id: VNID("_CFPartsFoundIn"), label: "Part of", importance: 5, valueExpression: "this.related(via=RT[_HASA])", note: ""},
            },
            enabledFeatures: {},
        },
        "_ETIMAGE": {
            id: VNID("_ETIMAGE"),
            name: "Image",
            description: "An image, such as a photo of a plant",
            friendlyIdPrefix: "img-",
            simplePropValues: {
                "_CFImageRelatesTo": {id: VNID("_CFImageRelatesTo"), label: "Relates to", importance: 1, valueExpression: `this.related(via=RT[_IRelTo], direction="from")`, note: ""},
            },
            enabledFeatures: {
                Image: {},
            },
        },
        "_ETPROPERTY": {
            id: VNID("_ETPROPERTY"),
            name: "Property",
            description: "Properties of a PlantDB entry.",
            friendlyIdPrefix: "p-",
            simplePropValues: {},
            enabledFeatures: {
                UseAsProperty: {
                    appliesToEntryTypes: [
                        VNID("_ETCLASS"),
                        VNID("_ETDIVISION"),
                        VNID("_ETFAMILY"),
                        VNID("_ETGENUS"),
                        VNID("_ETORDER"),
                        VNID("_ETPLANTPART"),
                        VNID("_ETSPECIES"),
                    ],
                }
            },
        },
    },
    relationshipTypes: {
        "_CisD": {
            id: VNID("_CisD"),
            nameForward: "is a",
            nameReverse: "has class",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETCLASS")],
            toEntryTypes: [VNID("_ETDIVISION")],
        },
        "_OisC": {
            id: VNID("_OisC"),
            nameForward: "is a",
            nameReverse: "has order",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETORDER")],
            toEntryTypes: [VNID("_ETCLASS")],
        },
        "_FisO": {
            id: VNID("_FisO"),
            nameForward: "is a",
            nameReverse: "has family",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETFAMILY")],
            toEntryTypes: [VNID("_ETORDER")],
        },
        "_GisF": {
            id: VNID("_GisF"),
            nameForward: "is a",
            nameReverse: "has genus",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETGENUS")],
            toEntryTypes: [VNID("_ETFAMILY")],
        },
        "_SisG": {
            id: VNID("_SisG"),
            nameForward: "is a",
            nameReverse: "has species",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETSPECIES")],
            toEntryTypes: [VNID("_ETGENUS")],
        },
        // At any level, a classification of plants can have a specific part, e.g. conifers have cones
        "_HASA": {
            id: VNID("_HASA"),
            nameForward: "has",
            nameReverse: "found in",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [
                // From every level of classification. These are in alphabetical order though to match how Neolace returns a site's schema.
                VNID("_ETCLASS"),
                VNID("_ETDIVISION"),
                VNID("_ETFAMILY"),
                VNID("_ETGENUS"),
                VNID("_ETORDER"),
                VNID("_ETSPECIES"),
            ],
            toEntryTypes: [VNID("_ETPLANTPART")],
        },
        // At any level, a classification of plants can have a specific part, e.g. conifers have cones
        "_HasHeroImage": {
            id: VNID("_HasHeroImage"),
            nameForward: "has hero image",
            nameReverse: "found in",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [
                // From every non-image entry type
                VNID("_ETCLASS"),
                VNID("_ETDIVISION"),
                VNID("_ETFAMILY"),
                VNID("_ETGENUS"),
                VNID("_ETORDER"),
                VNID("_ETPLANTPART"),
                VNID("_ETSPECIES"),
            ],
            toEntryTypes: [VNID("_ETIMAGE")],
        },
        // An image can be related to anything
        "_IRelTo": {
            id: VNID("_IRelTo"),
            nameForward: "relates to",
            nameReverse: "has related images",
            category: RelationshipCategory.RELATES_TO,
            description: null,
            fromEntryTypes: [
                VNID("_ETIMAGE"),
            ],
            toEntryTypes: [
                // An image can related to anything. These are in alphabetical order though to match how Neolace returns a site's schema.
                VNID("_ETCLASS"),
                VNID("_ETDIVISION"),
                VNID("_ETFAMILY"),
                VNID("_ETGENUS"),
                VNID("_ETORDER"),
                VNID("_ETPLANTPART"),
                VNID("_ETSPECIES"),
            ],
        },
        // A plant part can be another type of plant part:
        "_PARTisPART": {
            id: VNID("_PARTisPART"),
            nameForward: "is a",
            nameReverse: "has type",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_ETPLANTPART")],
            toEntryTypes: [VNID("_ETPLANTPART")],
        },
    },
    properties: {
        "_parentTaxon": {
            id: VNID("_parentTaxon"),
            name: "Parent taxon",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            mode: PropertyMode.Optional,
            appliesTo: [],
            descriptionMD: `The parent taxon of this entry.`,
            importance: 0,
        },
        "_parentDivision": {
            id: VNID("_parentDivision"),
            isA: [VNID("_parentTaxon")],  // This is a more specific "parent taxon" property
            name: "Division",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            appliesTo: [{entryType: VNID("_ETCLASS")}],
            valueConstraint: `x.type() = entryType("_ETDIVISION")`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent division of this class.`,
            importance: 0,
        },
        "_parentClass": {
            id: VNID("_parentClass"),
            isA: [VNID("_parentTaxon")],  // This is a more specific "parent taxon" property
            name: "Class",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            appliesTo: [{entryType: VNID("_ETORDER")}],
            valueConstraint: `x.type() = entryType("_ETCLASS")`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent class of this order.`,
            importance: 0,
        },
        "_parentOrder": {
            id: VNID("_parentOrder"),
            isA: [VNID("_parentTaxon")],  // This is a more specific "parent taxon" property
            name: "Order",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            appliesTo: [{entryType: VNID("_ETFAMILY")}],
            valueConstraint: `x.type() = entryType("_ETORDER")`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent order of this family.`,
            importance: 0,
        },
        "_parentFamily": {
            id: VNID("_parentFamily"),
            isA: [VNID("_parentTaxon")],  // This is a more specific "parent taxon" property
            name: "Family",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            appliesTo: [{entryType: VNID("_ETGENUS")}],
            valueConstraint: `x.type() = entryType("_ETFAMILY")`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent family of this genus.`,
            importance: 0,
        },
        "_parentGenus": {
            id: VNID("_parentGenus"),
            isA: [VNID("_parentTaxon")],  // This is a more specific "parent taxon" property
            name: "Genus",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Single,
            appliesTo: [{entryType: VNID("_ETSPECIES")}],
            valueConstraint: `x.type() = entryType("_ETGENUS")`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent genus of this species.`,
            importance: 0,
        },
        "_divClasses": {
            id: VNID("_divClasses"),
            name: "Classes",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETDIVISION")}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_parentTaxon])`,
            descriptionMD: `Classes that are part of this division.`,
            importance: 3,
        },
        "_classOrders": {
            id: VNID("_classOrders"),
            name: "Orders",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETCLASS")}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_parentTaxon])`,
            descriptionMD: `Orders that are part of this class.`,
            importance: 3,
        },
        "_orderFamilies": {
            id: VNID("_orderFamilies"),
            name: "Families",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETORDER")}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_parentTaxon])`,
            descriptionMD: `Families that are part of this order.`,
            importance: 3,
        },
        "_familyGenera": {
            id: VNID("_familyGenera"),
            name: "Genera",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETFAMILY")}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_parentTaxon])`,
            descriptionMD: `Genera (genuses) that are part of this family.`,
            importance: 3,
        },
        "_genusSpecies": {
            id: VNID("_genusSpecies"),
            name: "Species",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETSPECIES"),}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_parentTaxon])`,
            descriptionMD: `Species that are part of this genus.`,
            importance: 3,
        },
        "_taxonomy": {
            id: VNID("_taxonomy"),
            name: "Taxonomy",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [
                {entryType: VNID("_ETCLASS")},
                {entryType: VNID("_ETDIVISION")},
                {entryType: VNID("_ETFAMILY")},
                {entryType: VNID("_ETGENUS")},
                {entryType: VNID("_ETORDER")},
                {entryType: VNID("_ETSPECIES")},
            ],
            mode: PropertyMode.Auto,
            default: `this.ancestors()`,
            descriptionMD: `The full taxonomy of this PlantDB entry.`,
            importance: 5,
        },
        // An image RELATES TO [a Tech Concept]
        "_imgRelTo": {
            id: VNID("_imgRelTo"),
            name: "Relates to",
            type: PropertyType.RelRelatesTo,
            cardinality: PropertyCardinality.Unique,
            appliesTo: [{entryType: VNID("_ETIMAGE")}],
            valueConstraint: `x.type() in [entryType("_ETCLASS"), entryType("_ETDIVISION"), entryType("_ETFAMILY"), entryType("_ETGENUS"), entryType("_ETORDER"), entryType("_ETPLANTPART"), entryType("_ETSPECIES")]`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Lists PlantDB entries that this images relates to.`,
            importance: 8,
        },
        // Related images
        "_relImages": {
            id: VNID("_relImages"),
            name: "Related images",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [
                {entryType: VNID("_ETCLASS"),},
                {entryType: VNID("_ETDIVISION")},
                {entryType: VNID("_ETFAMILY")},
                {entryType: VNID("_ETGENUS")},
                {entryType: VNID("_ETORDER")},
                {entryType: VNID("_ETPLANTPART")},
                {entryType: VNID("_ETSPECIES")},
            ],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverseProp(prop=[/prop/_imgRelTo])`,
            descriptionMD: `Images related to this entry.`,
            importance: 10,
        },
        // Has part
        "_hasPart": {
            id: VNID("_hasPart"),
            name: "Has part",
            type: PropertyType.RelHasA,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [
                {entryType: VNID("_ETCLASS")},
                {entryType: VNID("_ETDIVISION")},
                {entryType: VNID("_ETFAMILY")},
                {entryType: VNID("_ETGENUS")},
                {entryType: VNID("_ETORDER")},
                {entryType: VNID("_ETSPECIES")},
            ],
            mode: PropertyMode.Optional,
            valueConstraint: `x.type() = entryType("_ETPLANTPART")`,
            descriptionMD: `This [species/genus/etc.] has this part(s).`,
            importance: 10,
        },
        // Plant part is found in
        "_partFoundIn": {
            id: VNID("_partFoundIn"),
            name: "Found in",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETPLANTPART")}],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverseProp(prop=[/prop/_hasPart])`,
            descriptionMD: `This plant is found in these species/genera/etc.`,
            importance: 10,
        },
        // Plant part is a type of plant part
        "_partIsAPart": {
            id: VNID("_partIsAPart"),
            name: "Is a",
            type: PropertyType.RelIsA,
            cardinality: PropertyCardinality.Unique,
            appliesTo: [{entryType: VNID("_ETPLANTPART")}],
            mode: PropertyMode.Recommended,
            descriptionMD: `The more general class of this plant part.`,
            importance: 0,
        },
        "_partHasTypes": {
            id: VNID("_partHasTypes"),
            name: "Has types",
            type: PropertyType.RelOther,
            cardinality: PropertyCardinality.Multiple,
            appliesTo: [{entryType: VNID("_ETPLANTPART")}],
            mode: PropertyMode.Auto,
            default: `this.reverseProp(prop=[/prop/_partIsAPart])`,
            descriptionMD: `Sub-types of this plant part`,
            importance: 3,
        },
    },
});
