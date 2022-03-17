import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyMode, PropertyType, SiteSchemaData } from "neolace/deps/neolace-api.ts";

// Type helper to ensure that the schema is a valid SiteSchemaData without
// collapsing the type down to just "SiteSchemaData"
function ValidateSiteSchema<X extends SiteSchemaData>(x: X): X {
    return x;
}

// Import the schema:
export const schema = ValidateSiteSchema({
    entryTypes: {
        "_ETDIVISION": {
            id: VNID("_ETDIVISION"),
            name: "Division",
            description:
                "A division (also called Phylum outside of botany) is the main taxonomic classification within the Plant Kingdom.",
            friendlyIdPrefix: "d-",
            enabledFeatures: {},
        },
        "_ETCLASS": {
            id: VNID("_ETCLASS"),
            name: "Class",
            description: "A class is a level of taxonomic classification between Division/Phylum and Order.",
            friendlyIdPrefix: "c-",
            enabledFeatures: {},
        },
        "_ETORDER": {
            id: VNID("_ETORDER"),
            name: "Order",
            description: "An order is a level of taxonomic classification between Class and Family.",
            friendlyIdPrefix: "o-",
            enabledFeatures: {},
        },
        "_ETFAMILY": {
            id: VNID("_ETFAMILY"),
            name: "Family",
            description: "A family is a level of taxonomic classification between Order and Genus.",
            friendlyIdPrefix: "f-",
            enabledFeatures: {},
        },
        "_ETGENUS": {
            id: VNID("_ETGENUS"),
            name: "Genus",
            description: "A genus is a level of taxonomic classification between Family and Species.",
            friendlyIdPrefix: "g-",
            enabledFeatures: {},
        },
        "_ETSPECIES": {
            id: VNID("_ETSPECIES"),
            name: "Species",
            description: "A species is a basic unit of classifying life.",
            friendlyIdPrefix: "s-",
            enabledFeatures: {
                Article: {},
                HeroImage: {
                    lookupExpression: `this.get(prop=[[/prop/_hasHeroImage]])`,
                },
            },
        },
        "_ETPLANTPART": {
            id: VNID("_ETPLANTPART"),
            name: "Plant Part",
            description: "Describes a part of a plant.",
            friendlyIdPrefix: "pp-",
            enabledFeatures: {},
        },
        "_ETIMAGE": {
            id: VNID("_ETIMAGE"),
            name: "Image",
            description: "An image, such as a photo of a plant",
            friendlyIdPrefix: "img-",
            enabledFeatures: {
                Image: {},
            },
        },
    },
    properties: {
        "_parentTaxon": {
            id: VNID("_parentTaxon"),
            name: "Parent taxon",
            type: PropertyType.RelIsA,
            mode: PropertyMode.Optional,
            appliesTo: [],
            descriptionMD: `The parent taxon of this entry.`,
            importance: 0,
        },
        "_parentDivision": {
            id: VNID("_parentDivision"),
            isA: [VNID("_parentTaxon")], // This is a more specific "parent taxon" property
            name: "Division",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETCLASS") }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETDIVISION"))`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent division of this class.`,
            importance: 0,
        },
        "_parentClass": {
            id: VNID("_parentClass"),
            isA: [VNID("_parentTaxon")], // This is a more specific "parent taxon" property
            name: "Class",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETORDER") }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETCLASS"))`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent class of this order.`,
            importance: 0,
        },
        "_parentOrder": {
            id: VNID("_parentOrder"),
            isA: [VNID("_parentTaxon")], // This is a more specific "parent taxon" property
            name: "Order",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETFAMILY") }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETORDER"))`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent order of this family.`,
            importance: 0,
        },
        "_parentFamily": {
            id: VNID("_parentFamily"),
            isA: [VNID("_parentTaxon")], // This is a more specific "parent taxon" property
            name: "Family",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETGENUS") }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETFAMILY"))`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent family of this genus.`,
            importance: 0,
        },
        "_parentGenus": {
            id: VNID("_parentGenus"),
            isA: [VNID("_parentTaxon")], // This is a more specific "parent taxon" property
            name: "Genus",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETSPECIES") }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETGENUS"))`,
            mode: PropertyMode.Required,
            descriptionMD: `The parent genus of this species.`,
            importance: 0,
        },
        "_divClasses": {
            id: VNID("_divClasses"),
            name: "Classes",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETDIVISION") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_parentDivision]])`,
            descriptionMD: `Classes that are part of this division.`,
            importance: 3,
        },
        "_classOrders": {
            id: VNID("_classOrders"),
            name: "Orders",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETCLASS") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_parentClass]])`,
            descriptionMD: `Orders that are part of this class.`,
            importance: 3,
        },
        "_orderFamilies": {
            id: VNID("_orderFamilies"),
            name: "Families",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETORDER") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_parentOrder]])`,
            descriptionMD: `Families that are part of this order.`,
            importance: 3,
        },
        "_familyGenera": {
            id: VNID("_familyGenera"),
            name: "Genera",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETFAMILY") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_parentFamily]])`,
            descriptionMD: `Genera (genuses) that are part of this family.`,
            importance: 3,
        },
        "_genusSpecies": {
            id: VNID("_genusSpecies"),
            name: "Species",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETGENUS") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_parentGenus]])`,
            descriptionMD: `Species that are part of this genus.`,
            importance: 3,
        },
        "_taxonomy": {
            id: VNID("_taxonomy"),
            name: "Taxonomy",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryType: VNID("_ETCLASS") },
                { entryType: VNID("_ETDIVISION") },
                { entryType: VNID("_ETFAMILY") },
                { entryType: VNID("_ETGENUS") },
                { entryType: VNID("_ETORDER") },
                { entryType: VNID("_ETSPECIES") },
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
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETIMAGE") }],
            valueConstraint:
                `(targetEntry -> targetEntry.type() in [entryType("_ETCLASS"), entryType("_ETDIVISION"), entryType("_ETFAMILY"), entryType("_ETGENUS"), entryType("_ETORDER"), entryType("_ETPLANTPART"), entryType("_ETSPECIES")])`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Lists PlantDB entries that this images relates to.`,
            importance: 8,
        },
        // Related images
        "_relImages": {
            id: VNID("_relImages"),
            name: "Related images",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryType: VNID("_ETCLASS") },
                { entryType: VNID("_ETDIVISION") },
                { entryType: VNID("_ETFAMILY") },
                { entryType: VNID("_ETGENUS") },
                { entryType: VNID("_ETORDER") },
                { entryType: VNID("_ETPLANTPART") },
                { entryType: VNID("_ETSPECIES") },
            ],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=[[/prop/_imgRelTo]])`,
            descriptionMD: `Images related to this entry.`,
            importance: 10,
        },
        // Has hero image
        "_hasHeroImage": {
            id: VNID("_hasHeroImage"),
            name: "Has hero image",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryType: VNID("_ETCLASS") },
                { entryType: VNID("_ETDIVISION") },
                { entryType: VNID("_ETFAMILY") },
                { entryType: VNID("_ETGENUS") },
                { entryType: VNID("_ETORDER") },
                { entryType: VNID("_ETPLANTPART") },
                { entryType: VNID("_ETSPECIES") },
            ],
            mode: PropertyMode.Recommended,
            descriptionMD: `Hero image used for this entry`,
            importance: 21,
        },
        // Has part
        "_hasPart": {
            id: VNID("_hasPart"),
            name: "Has part",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryType: VNID("_ETCLASS") },
                { entryType: VNID("_ETDIVISION") },
                { entryType: VNID("_ETFAMILY") },
                { entryType: VNID("_ETGENUS") },
                { entryType: VNID("_ETORDER") },
                { entryType: VNID("_ETSPECIES") },
            ],
            mode: PropertyMode.Optional,
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("_ETPLANTPART"))`,
            descriptionMD: `This [species/genus/etc.] has this part(s).`,
            importance: 10,
            inheritable: true,
            enableSlots: true,
        },
        // Plant part is found in
        "_partFoundIn": {
            id: VNID("_partFoundIn"),
            name: "Found in",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETPLANTPART") }],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=[[/prop/_hasPart]])`,
            descriptionMD: `This plant is found in these species/genera/etc.`,
            importance: 10,
        },
        // Plant part is a type of plant part
        "_partIsAPart": {
            id: VNID("_partIsAPart"),
            name: "Is a",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryType: VNID("_ETPLANTPART") }],
            mode: PropertyMode.Recommended,
            descriptionMD: `The more general class of this plant part.`,
            importance: 0,
        },
        "_partHasTypes": {
            id: VNID("_partHasTypes"),
            name: "Has types",
            type: PropertyType.RelOther,
            appliesTo: [{ entryType: VNID("_ETPLANTPART") }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/_partIsAPart]])`,
            descriptionMD: `Sub-types of this plant part`,
            importance: 3,
        },
        ////////////////////////////////////////////////////////////////////////////////////////
        ///////// Value properties:

        // A plant's scientific name
        "_propScientificName": {
            id: VNID("_propScientificName"),
            name: "Scientific name",
            type: PropertyType.Value,
            appliesTo: [{ entryType: VNID("_ETSPECIES") }],
            mode: PropertyMode.Required,
            descriptionMD:
                "The **scientific name**, sometimes called the **binomial name** or **latin name** is an unambiguous species identifier.",
            importance: 3,
            displayAs: "*{value}*",
        },
        // An entry's Wikidata Entry ID
        "_propWikidataQID": {
            id: VNID("_propWikidataQID"),
            name: "Wikidata Item ID",
            type: PropertyType.Value,
            appliesTo: [
                { entryType: VNID("_ETCLASS") },
                { entryType: VNID("_ETDIVISION") },
                { entryType: VNID("_ETFAMILY") },
                { entryType: VNID("_ETGENUS") },
                { entryType: VNID("_ETORDER") },
                { entryType: VNID("_ETSPECIES") },
            ],
            mode: PropertyMode.Optional,
            descriptionMD: "ID of this item on Wikidata, the free knowledge base that anyone can edit.",
            importance: 15,
            displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",
        },
    },
});
