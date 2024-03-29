/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { EntryTypeColor, PropertyMode, PropertyType, SiteSchemaData } from "neolace/deps/neolace-sdk.ts";

// Type helper to ensure that the schema is a valid SiteSchemaData without
// collapsing the type down to just "SiteSchemaData"
function ValidateSiteSchema<X extends SiteSchemaData>(x: X): X {
    return x;
}

// Import the schema:
export const schema = ValidateSiteSchema({
    entryTypes: {
        "ETDIVISION": {
            key: "ETDIVISION",
            name: "Division",
            description:
                "A division (also called Phylum outside of botany) is the main taxonomic classification within the Plant Kingdom.",
            keyPrefix: "d-",
            color: EntryTypeColor.Red,
            abbreviation: "D",
            enabledFeatures: {},
        },
        "ETCLASS": {
            key: "ETCLASS",
            name: "Class",
            description: "A class is a level of taxonomic classification between Division/Phylum and Order.",
            keyPrefix: "c-",
            color: EntryTypeColor.Violet,
            abbreviation: "C",
            enabledFeatures: {},
        },
        "ETORDER": {
            key: "ETORDER",
            name: "Order",
            description: "An order is a level of taxonomic classification between Class and Family.",
            keyPrefix: "o-",
            color: EntryTypeColor.Orange,
            abbreviation: "O",
            enabledFeatures: {},
        },
        "ETFAMILY": {
            key: "ETFAMILY",
            name: "Family",
            description: "A family is a level of taxonomic classification between Order and Genus.",
            keyPrefix: "f-",
            color: EntryTypeColor.Cyan,
            abbreviation: "F",
            enabledFeatures: {},
        },
        "ETGENUS": {
            key: "ETGENUS",
            name: "Genus",
            description: "A genus is a level of taxonomic classification between Family and Species.",
            keyPrefix: "g-",
            color: EntryTypeColor.Emerald,
            abbreviation: "G",
            enabledFeatures: {},
        },
        "ETSPECIES": {
            key: "ETSPECIES",
            name: "Species",
            description: "A species is a basic unit of classifying life.",
            keyPrefix: "s-",
            color: EntryTypeColor.Blue,
            abbreviation: "S",
            enabledFeatures: {
                Article: {},
                HeroImage: {
                    lookupExpression: `this.get(prop=prop("hasHeroImage"))`,
                },
            },
        },
        "ETPLANTPART": {
            key: "ETPLANTPART",
            name: "Plant Part",
            description: "Describes a part of a plant.",
            keyPrefix: "pp-",
            color: EntryTypeColor.Yellow,
            abbreviation: "PP",
            enabledFeatures: {},
        },
        "ETIMAGE": {
            key: "ETIMAGE",
            name: "Image",
            description: "An image, such as a photo of a plant",
            keyPrefix: "img-",
            color: EntryTypeColor.Default,
            abbreviation: "IM",
            enabledFeatures: {
                Image: {},
            },
        },
    },
    properties: {
        "parentTaxon": {
            key: "parentTaxon",
            name: "Parent taxon",
            type: PropertyType.RelIsA,
            mode: PropertyMode.Optional,
            appliesTo: [],
            description: `The parent taxon of this entry.`,
            rank: 0,
        },
        "parentDivision": {
            key: "parentDivision",
            isA: ["parentTaxon"], // This is a more specific "parent taxon" property
            name: "Division",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETCLASS" }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETDIVISION"))`,
            mode: PropertyMode.Required,
            description: `The parent division of this class.`,
            rank: 0,
        },
        "parentClass": {
            key: "parentClass",
            isA: ["parentTaxon"], // This is a more specific "parent taxon" property
            name: "Class",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETORDER" }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETCLASS"))`,
            mode: PropertyMode.Required,
            description: `The parent class of this order.`,
            rank: 0,
        },
        "parentOrder": {
            key: "parentOrder",
            isA: ["parentTaxon"], // This is a more specific "parent taxon" property
            name: "Order",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETFAMILY" }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETORDER"))`,
            mode: PropertyMode.Required,
            description: `The parent order of this family.`,
            rank: 0,
        },
        "parentFamily": {
            key: "parentFamily",
            isA: ["parentTaxon"], // This is a more specific "parent taxon" property
            name: "Family",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETGENUS" }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETFAMILY"))`,
            mode: PropertyMode.Required,
            description: `The parent family of this genus.`,
            rank: 0,
        },
        "parentGenus": {
            key: "parentGenus",
            isA: ["parentTaxon"], // This is a more specific "parent taxon" property
            name: "Genus",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETSPECIES" }],
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETGENUS"))`,
            mode: PropertyMode.Required,
            description: `The parent genus of this species.`,
            rank: 0,
        },
        "divClasses": {
            key: "divClasses",
            name: "Classes",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETDIVISION" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("parentDivision"))`,
            description: `Classes that are part of this division.`,
            rank: 3,
        },
        "classOrders": {
            key: "classOrders",
            name: "Orders",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETCLASS" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("parentClass"))`,
            description: `Orders that are part of this class.`,
            rank: 3,
        },
        "orderFamilies": {
            key: "orderFamilies",
            name: "Families",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETORDER" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("parentOrder"))`,
            description: `Families that are part of this order.`,
            rank: 3,
        },
        "familyGenera": {
            key: "familyGenera",
            name: "Genera",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETFAMILY" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("parentFamily"))`,
            description: `Genera (genuses) that are part of this family.`,
            rank: 3,
        },
        "genusSpecies": {
            key: "genusSpecies",
            name: "Species",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETGENUS" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("parentGenus"))`,
            description: `Species that are part of this genus.`,
            rank: 3,
        },
        "taxonomy": {
            key: "taxonomy",
            name: "Taxonomy",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryTypeKey: "ETCLASS" },
                { entryTypeKey: "ETDIVISION" },
                { entryTypeKey: "ETFAMILY" },
                { entryTypeKey: "ETGENUS" },
                { entryTypeKey: "ETORDER" },
                { entryTypeKey: "ETSPECIES" },
            ],
            mode: PropertyMode.Auto,
            default: `this.ancestors()`,
            description: `The full taxonomy of this PlantDB entry.`,
            rank: 5,
        },
        // An image RELATES TO [an entry]
        "imgRelTo": {
            key: "imgRelTo",
            name: "Relates to",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETIMAGE" }],
            valueConstraint:
                `(targetEntry -> targetEntry.type() in [entryType("ETCLASS"), entryType("ETDIVISION"), entryType("ETFAMILY"), entryType("ETGENUS"), entryType("ETORDER"), entryType("ETPLANTPART"), entryType("ETSPECIES")])`,
            mode: PropertyMode.Recommended,
            description: `Lists PlantDB entries that this images relates to.`,
            rank: 8,
        },
        // Related images
        "relImages": {
            key: "relImages",
            name: "Related images",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryTypeKey: "ETCLASS" },
                { entryTypeKey: "ETDIVISION" },
                { entryTypeKey: "ETFAMILY" },
                { entryTypeKey: "ETGENUS" },
                { entryTypeKey: "ETORDER" },
                { entryTypeKey: "ETPLANTPART" },
                { entryTypeKey: "ETSPECIES" },
            ],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=prop("imgRelTo")).image(format="thumb")`,
            description: `Images related to this entry.`,
            rank: 10,
        },
        // Has hero image
        "hasHeroImage": {
            key: "hasHeroImage",
            name: "Has hero image",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryTypeKey: "ETCLASS" },
                { entryTypeKey: "ETDIVISION" },
                { entryTypeKey: "ETFAMILY" },
                { entryTypeKey: "ETGENUS" },
                { entryTypeKey: "ETORDER" },
                { entryTypeKey: "ETPLANTPART" },
                { entryTypeKey: "ETSPECIES" },
            ],
            mode: PropertyMode.Recommended,
            description: `Hero image used for this entry`,
            rank: 60,
        },
        // Has part
        "hasPart": {
            key: "hasPart",
            name: "Has part",
            type: PropertyType.RelOther,
            appliesTo: [
                { entryTypeKey: "ETCLASS" },
                { entryTypeKey: "ETDIVISION" },
                { entryTypeKey: "ETFAMILY" },
                { entryTypeKey: "ETGENUS" },
                { entryTypeKey: "ETORDER" },
                { entryTypeKey: "ETSPECIES" },
            ],
            mode: PropertyMode.Optional,
            valueConstraint: `(targetEntry -> targetEntry.type() = entryType("ETPLANTPART"))`,
            description: `This [species/genus/etc.] has this part(s).`,
            rank: 10,
            inheritable: true,
            enableSlots: true,
        },
        // Plant part is found in
        "partFoundIn": {
            key: "partFoundIn",
            name: "Found in",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETPLANTPART" }],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=prop("hasPart"))`,
            description: `This plant part is found in these species/genera/etc.`,
            rank: 10,
        },
        // Plant part is a type of plant part
        "partIsAPart": {
            key: "partIsAPart",
            name: "Is a",
            type: PropertyType.RelIsA,
            appliesTo: [{ entryTypeKey: "ETPLANTPART" }],
            mode: PropertyMode.Recommended,
            description: `The more general class of this plant part.`,
            rank: 0,
        },
        "partHasTypes": {
            key: "partHasTypes",
            name: "Has types",
            type: PropertyType.RelOther,
            appliesTo: [{ entryTypeKey: "ETPLANTPART" }],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=prop("partIsAPart"))`,
            description: `Sub-types of this plant part`,
            rank: 3,
        },
        ////////////////////////////////////////////////////////////////////////////////////////
        ///////// Value properties:

        // A plant's scientific name
        "propScientificName": {
            key: "propScientificName",
            name: "Scientific name",
            type: PropertyType.Value,
            appliesTo: [{ entryTypeKey: "ETSPECIES" }],
            mode: PropertyMode.Required,
            description:
                "The **scientific name**, sometimes called the **binomial name** or **latin name** is an unambiguous species identifier.",
            rank: 3,
            displayAs: "*{value}*",
        },
        // An entry's Wikidata Entry ID
        "propWikidataQID": {
            key: "propWikidataQID",
            name: "Wikidata Item ID",
            type: PropertyType.Value,
            appliesTo: [
                { entryTypeKey: "ETCLASS" },
                { entryTypeKey: "ETDIVISION" },
                { entryTypeKey: "ETFAMILY" },
                { entryTypeKey: "ETGENUS" },
                { entryTypeKey: "ETORDER" },
                { entryTypeKey: "ETSPECIES" },
            ],
            mode: PropertyMode.Optional,
            description: "ID of this item on Wikidata, the free knowledge base that anyone can edit.",
            rank: 15,
            displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",
        },
        // Other names for a plant
        "propOtherNames": {
            key: "propOtherNames",
            name: "Other names",
            type: PropertyType.Value,
            appliesTo: [{ entryTypeKey: "ETSPECIES" }],
            mode: PropertyMode.Optional,
            description: "Other common names for this species.",
            rank: 5,
        },
    },
});
