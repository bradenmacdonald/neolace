import { VNID, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, PropertyType, PropertyMode } from "neolace/deps/neolace-api.ts";

 // IDs used in the TechNotes schema:
const ids = {
    // Entry types:
    image: VNID("_TNIMAGE"),
    technotesMetaPage: VNID("_TNMETA"),
    techConcept: VNID("_TECHCONCEPT"),
    product: VNID("_TNPRODUCT"),
    // Relationship Properties:
    propTypeOf: VNID("_TNTYPEOF"),  // An entry is a sub-type of another entry
    propProductTypeOf: VNID("_TNPRODTYPEOF"),  // A product is an instance of a tech concept
    propHasTypes: VNID("_TNHASTYPES"),  // Inverse of "is a"
    propHasPart: VNID("_TNHASPART"),  // A TechConcept has a specific part
    propUsedIn: VNID("_TNUSEDIN"),  // A TechConcept is used in (as a part of) another TechConcept
    propProducts: VNID("_TNTCPRODS"),  // A TechConcept is sold as these products
    propHasHeroImage: VNID("_TNHEROIMG"),  // An entry has a hero image
    propImgRelatesTo: VNID("_TNIMGRELTO"),  // An image relates to another entry
    propRelatedImages: VNID("_TNRELIMG"),  // Images that relate to this entry
    // Value properties:
    propAlsoKnownAs: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    propBatteryCapacity: VNID("_3YBzKxiYFNL4fKmPmwkR02"),
    propContentSource: VNID("_2QK8KQVZfHogH5ofrksCba"),
    propCreator: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    propDiameter: VNID("_3JjzqBJ9YLtRGuesdK0lWb"),
    propEnergyCapacity: VNID("_2rjuZG10x7wkyK9qTmyLpb"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propLength: VNID("_1PPhmzTVqhSwjbyZtAsIBm"),
    propLicense: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
    propPartDesc: VNID("_5mRCXHh5B0ind07yacFjrG"),
    propPartName: VNID("_11maZ7ydq2yYrVZP0mWjiM"),
    propPartNumber: VNID("_4bvR1zLMZiaRJSEHafjjY2"),
    propPhysicalDimension: VNID("_1shoq3dCEZa9oZVbusxdLq"),
    propProductId: VNID("_24ENtvOAo3S3qJLng6zK9W"),
    propVoltage: VNID("_3wbyWEuX0jvbLp50LfkWqq"),
    propVoltageNominal: VNID("_5Ig4uud6awMR9r6fv2D6ct"),
    propVoltageRange: VNID("_6p5hONbWITtDUuRgBoP8w7"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    // propWikidataPropertyId: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    propWordNetILI: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
    // spare: VNID("_5NDv1p9XePVw78O1J4O6CU"),
    // spare: VNID("_1gmfN52WbkhND3ddafEzTN"),
    // spare: VNID("_2wxta2uUjoKShB6lCLY8c5"),
    // spare: VNID("_35JmgPECXhyWiKNHrQas3M"),
    // spare: VNID("_7jO8Fx7LRlDUKaEXBSCYjI"),
    // spare: VNID("_1W0cnhDMIMvI3P8qEAf4Qo"),
    // spare: VNID("_6RgOBzvD18iZXyDJnaU853"),
    // spare: VNID("_6cn1VYJA81y06Hy9LbU3aU"),
    // spare: VNID("_7TYgaEdsNoK3ORMPO6Wjjy"),
    // spare: VNID("_10SZOU3H8C2mkfz3L6xpo5"),
    // spare: VNID("_6P11n0Z19GzwRlBFu5IvqP"),
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
        // Product:
        [ids.product]: {
            id: ids.product,
            name: "Product",
            description: "A product is a device or system developed to be manufactured and sold/used.",
            friendlyIdPrefix: "p-",
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
        // A product IS A Tech Concept
        [ids.propProductTypeOf]: {
            id: ids.propProductTypeOf,
            name: "Is a",
            type: PropertyType.RelIsA,
            appliesTo: [{entryType: ids.product}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `This product is an instance of this more general tech concept.`,
            importance: 0,
            standardURL: "",
        },
        [ids.propProducts]: {
            id: ids.propProducts,
            name: "Products",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/${ids.propProductTypeOf}]])`,
            descriptionMD: `Products that are instances of this tech concept.`,
            importance: 8,
            // standardURL: "?",
            // wikidataPID: "?",
        },
        // A TechConcept/product HAS PART [other Tech Concept]
        [ids.propHasPart]: {
            id: ids.propHasPart,
            name: "Has part",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            valueConstraint: `x.type() = entryType("${ids.techConcept}")`,
            mode: PropertyMode.Recommended,
            descriptionMD: `Lists known parts of this tech concept or product.`,
            importance: 4,
            // The HAS PART relationship uses the "slots" feature
            enableSlots: true,
        },
        // A TechConcept/product IS USED IN [other Tech Concept]
        [ids.propUsedIn]: {
            id: ids.propUsedIn,
            name: "Used in",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            mode: PropertyMode.Auto,
            default: `this.reverse(prop=[[/prop/${ids.propHasPart}]])`,
            descriptionMD: `Lists TechConcepts and products that use this as a part.`,
            importance: 8,
        },
        // An entry HAS HERO IMAGE [image]
        [ids.propHasHeroImage]: {
            id: ids.propHasHeroImage,
            name: "Hero Image",
            type: PropertyType.RelOther,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.technotesMetaPage}, {entryType: ids.product}],
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
            appliesTo: [{entryType: ids.image}, {entryType: ids.product}],
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
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            mode: PropertyMode.Auto,
            default: `this.andDescendants().reverse(prop=[[/prop/${ids.propImgRelatesTo}]])`,
            descriptionMD: `Images related to this entry.`,
            importance: 15,
        },

        // Property: Also known as
        [ids.propAlsoKnownAs]: {
            id: ids.propAlsoKnownAs,
            name: "Also known as",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
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
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `A physical dimension is a measurement or specification of some length or size, such as the width, height, length, diameter, or radius of an object.`,
            importance: 30,
            // propWordNetILI "i63761"
        },
        // Property: Length
        [ids.propLength]: {
            id: ids.propLength,
            name: "Length",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
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
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `The diameter is a measurement or specification of the distance across a circular or spherical shape (specifically, the length of a straight line passing through the center and connecting two points on the circumference).`,
            importance: 15,
            // [ids.propWikidataPropertyId]: {valueExpr: `"P2386"`},
            // [ids.propWordNetILI]: { valueExpr: `"i63810"` },
        },
        // Property: Voltage
        [ids.propVoltage]: {
            id: ids.propVoltage,
            name: "Voltage",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `Voltage is the difference in [electric potential](https://en.wikipedia.org/wiki/Electric_potential) between two points, such as the two terminals of a battery or two points in an electric circuit.`,
            importance: 10,
        },
        // Property: Nominal Voltage
        [ids.propVoltageNominal]: {
            id: ids.propVoltageNominal,
            name: "Nominal Voltage",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `Nominal voltage is the value assigned to an electrical component or system to indicate its typical voltage. The actual voltage that the component or system operates at may vary significantly from the nominal voltage.`,
            importance: 10,
            isA: [ids.propVoltage],
        },
        // Property: Voltage Range
        [ids.propVoltageRange]: {
            id: ids.propVoltageRange,
            name: "Voltage Range",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `The minimum and maximum voltage.`,
            importance: 10,
            isA: [ids.propVoltage],
        },
        // Property: Battery Capacity
        [ids.propBatteryCapacity]: {
            id: ids.propBatteryCapacity,
            name: "Battery Capacity",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `A battery's capacity is the amount of electric charge it can deliver at the rated voltage.`,
            importance: 10,
        },
        // Property: Energy Capacity
        [ids.propEnergyCapacity]: {
            id: ids.propEnergyCapacity,
            name: "Energy Capacity",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.techConcept}, {entryType: ids.product}],
            descriptionMD: `The amount of energy that this device can store.`,
            importance: 10,
        },
        // Property: Product identifier
        [ids.propProductId]: {
            id: ids.propProductId,
            name: "Product Identifier",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.product}],
            descriptionMD: `An identifier that uniquely identifies a product.`,
            importance: 5,
        },
        // Manufacturer's part number
        [ids.propPartNumber]: {
            id: ids.propPartNumber,
            name: "Part Number",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.product}],
            descriptionMD: `The part number of this product/part, according to the manufacturer.`,
            importance: 5,
            isA: [ids.propProductId],
            displayAs: `\`{value}\``,  // Display in monospace font.
        },
        // Manufacturer's part name
        [ids.propPartName]: {
            id: ids.propPartName,
            name: "Mfg. Part Name",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.product}],
            descriptionMD: `The name of this product/part according to the manufacturer.`,
            importance: 15,
        },
        // Manufacturer's part description
        [ids.propPartDesc]: {
            id: ids.propPartDesc,
            name: "Mfg. Part Description",
            type: PropertyType.Value,
            appliesTo: [{entryType: ids.product}],
            descriptionMD: `The description of this product/part provided by the manufacturer.`,
            importance: 16,
        },
    },
};
