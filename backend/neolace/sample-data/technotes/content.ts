import { VNID, } from "neolace/deps/vertex-framework.ts";
import { AnyContentEdit, UpdateEntryFeature, schemas } from "neolace/deps/neolace-api.ts";
import { schemaIds } from "./schema.ts";
import { files } from "./datafiles.ts";
// import { dedent } from "neolace/lib/dedent.ts";

export const ids = {
    // Internal IDs used for each entry, in alphabetical order
    // "Normally" it's not necessary to specify these (they're auto-generated behind the scenes) but because of how
    // we're working at the moment by erasing the database and re-creating all entries, it's important to ensure the
    // internal IDs used are consistent each time.
    battery: VNID("_5HYZND6114KVUtCGjFC8mT"),
    car: VNID("_4sd6mGkfpCfrvi3em2IFA0"),
    cell18650: VNID("_7RHY0mKlOEp2xsahAaNcbc"),
    cell2170: VNID("_725MCg9IOqXqKUUA2cEoSc"),
    cylindricalLithiumIonCell: VNID("_75HaEKOi2Ir5UV84KH3CGk"),
    electricCar: VNID("_1gJxmBoyHajaFBqxzu6KZi"),
    electrochemicalCell: VNID("_3VVHFqLRvQtI1YzMP7OxVV"),
    electrolyticCell: VNID("_2uDtUtOWJCL33X7zTAK8dK"),
    galvanicCell: VNID("_2azW7zIxVCeNrbXuRrsm2k"),
    lithiumIonCell: VNID("_5GDsp3jxMTJ1liBePo9sgT"),
    motorVehicle: VNID("_5lqx2yOMSlbibeIT5psLCr"),
    img18650cell: VNID("_5Dk4j3EUjThp91B1SeGwUF"),
    imgLiIonBatteryJellyRoll: VNID("_52FWviI73eaW6sIO8sZx0F"),
    imgMiniCooperSe: VNID("_5hqETvE3WTHuYvhHbwWuD"),
    primaryCell: VNID("_7OCTF7b5Z4wM7KvEE16OtK"),
    propAlsoKnownAs: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    propContentSource: VNID("_2QK8KQVZfHogH5ofrksCba"),
    propCreator: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    propDiameter: VNID("_3JjzqBJ9YLtRGuesdK0lWb"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propLength: VNID("_1PPhmzTVqhSwjbyZtAsIBm"),
    propLicense: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
    propPhysicalDimension: VNID("_1shoq3dCEZa9oZVbusxdLq"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    propWikidataPropertyId: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    propWordNetILI: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
    secondaryCell: VNID("_4HwJfgRjCzfOI7z2XTzY0r"),
    //spare: VNID("_51YyfHlwYxW1X5QfjRBai6"),
    //spare: VNID("_1bWGkkQDaPxHwmcMkO5cbu"),
    //spare: VNID("_1nmqoMNKS0MYZRjjzUiQd3"),
    //spare: VNID("_2G5LENTkqIXwRZkOD2xDRa"),
    //spare: VNID("_6dF6GUIrPx8ToREmsFAZ5R"),
    //spare: VNID("_5Z7bPDS8qOWy1DUHwpehjS"),
    //spare: VNID("_5QZEkrIjvgA7y3iP9qSEVi"),
    //spare: VNID("_1bquO1r9lmemPkQixL2eXT"),
    //spare: VNID("_3KPUsKAzTQZ6ZJT05VvagC"),
    //spare: VNID("_1vRUxDKM7tGDscdt4oDyzo"),
    //spare: VNID("_5IgIEXFV54PUucrhcKN26E"),
    //spare: VNID("_1HKE5qN2QazUiSYdvuEfjz"),
    // To generate more IDs:
    // From backend, run "deno", then
    //  import { VNID } from "./neolace/deps/vertex-framework.ts";
    // then
    //  new Array(20).fill(undefined).map(_ => VNID())
};

export const edits: AnyContentEdit[] = [
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
    // Motor Vehicle
    ...createEntry({
        id: ids.motorVehicle,
        name: "Motor Vehicle",
        friendlyId: "tc-motor-vehicle",
        type: schemaIds.techConcept,
        description: "A motor vehicle is a wheeled vehicle that can propel itself and which does not run on rails.",
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["automotive vehicle", "self-propelled vehicle"]) },
            [ids.propWikidataId]: { valueExpr: `"Q1420"` },
            // [ids.propWordNet31SynsetId]: { valueExpr: `"03796768-n"` },
            [ids.propWordNetILI]: { valueExpr: `"i56401"` },
        },
    }),
    // Car
    ...createEntry({
        id: ids.car,
        name: "Car",
        friendlyId: "tc-car",
        type: schemaIds.techConcept,
        description: "A car is a motor vehicle with four wheels, used primarily to transport people.",
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.motorVehicle},
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["motorcar", "automobile", "auto", "car"]) },
            [ids.propWikidataId]: { valueExpr: `"Q1420"` },
            // [ids.propWordNet31SynsetId]: { valueExpr: `"02961779-n"` },
            [ids.propWordNetILI]: { valueExpr: `"i51496"` },
        },
    }),
    // Electrochemical cell
    ...createEntry({
        id: ids.electrochemicalCell,
        name: "Electrochemical cell",
        friendlyId: "tc-ec-cell",
        type: schemaIds.techConcept,
        description: `An electrochemical cell is a device capable of either generating electrical energy from chemical reactions or using electrical energy to cause chemical reactions. Those which generate electrical energy are called galvanic cells, and are the principal buidling block of [electric batteries](/entry/${ids.battery}).`,
        rels: [
            // TODO: is an electric device
        ],
        props: {
            [ids.propWikidataId]: { valueExpr: `"Q80097"` },
            [ids.propWordNetILI]: { valueExpr: `"i51687"` },
        },
    }),
    ...createEntry({
        id: ids.galvanicCell,
        name: "Galvanic cell",
        friendlyId: "tc-ec-cell-g",
        type: schemaIds.techConcept,
        description: `A galvanic cell, also known as a voltaic cell, is an [electrochemical cell](/entry/${ids.electrochemicalCell}) that generates electrical energy through chemical reactions, specifically redox reactions. Galvanic cells are the building blocks of [batteries](/entry/${ids.battery}).`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.electrochemicalCell},
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["voltaic cell"]) },
            [ids.propWikidataId]: { valueExpr: `"Q209440"` },
            [ids.propWordNetILI]: { valueExpr: `"i60892"` },
        },
    }),
    // electrolytic cell
    ...createEntry({
        id: ids.electrolyticCell,
        name: "Electrolytic cell",
        friendlyId: "tc-ec-cell-e",
        type: schemaIds.techConcept,
        description: `An electrolytic cell is a [cell](/entry/${ids.electrochemicalCell}) containing an electrolyte in which an applied voltage causes a reaction to occur that would not occur otherwise (such as the breakdown of water into hydrogen and oxygen).`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.electrochemicalCell},
        ],
        props: {
            [ids.propWikidataId]: { valueExpr: `"Q2608426"` },
            [ids.propWordNetILI]: { valueExpr: `"i53363"` },
        },
    }),
    // Primary Cell
    ...createEntry({
        id: ids.primaryCell,
        name: "Primary cell",
        friendlyId: "tc-ec-cell-p",
        type: schemaIds.techConcept,
        description: `A primary cell is a [galvanic cell](/entry/${ids.galvanicCell}) that is designed to be used only once, such as the cells that comprise disposable batteries.`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.galvanicCell},
        ],
        props: {
            [ids.propWikidataId]: { valueExpr: `"Q1378887"` },
        },
        /* Example of how to add article text:
        features: [
            {featureType: "Article", articleMD: dedent`
                # This is a heading

                This is some content.
            `},
        ],
        */
    }),
    // Secondary cell
    ...createEntry({
        id: ids.secondaryCell,
        name: "Secondary cell",
        friendlyId: "tc-ec-cell-s",
        type: schemaIds.techConcept,
        description: `A secondary cell is a [galvanic cell](/entry/${ids.galvanicCell}) that can also be used as an [electrolytic cell](/entry/${ids.electrolyticCell}); in other words, it can be charged, then used to supply electrical energy to a device, then charged again. Rechargeable batteries are comprised of one or more secondary cells, as opposed to disposable batteries which are comprised of [primary cells](/entry/${ids.primaryCell}).`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.galvanicCell},
            {type: schemaIds.techConceptIsA, to: ids.electrolyticCell},
        ],
        props: {
            // Wikidata doesn't distinguish between "secondary cell" and "rechargeable battery", but WordNet does
            //[ids.propWikidataId]: { valueExpr: `"TBD_SET_ME"` },
            [ids.propWordNetILI]: { valueExpr: `"i59635"` },
        },
    }),
    // Lithium-ion cell
    ...createEntry({
        id: ids.lithiumIonCell,
        name: "Lithium-ion cell",
        friendlyId: "tc-ec-cell-li",
        type: schemaIds.techConcept,
        description: `A lithium-ion cell is a [secondary cell](/entry/${ids.secondaryCell}) ("rechargeable battery") that uses a lithium compound as its cathode (positive terminal) material, and typically graphite as the anode (negative terminal) material. Lithium-ion cells feature high energy density and low self-discharge, making them ideal for a variety devices including mobile phones and electric vehicle batteries.`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.secondaryCell},
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["Li-ion cell"]) },
            [ids.propWikidataId]: { valueExpr: `"Q2822895"` },
        },
    }),
    // cylindrical lithium-ion cell
    ...createEntry({
        id: ids.cylindricalLithiumIonCell,
        name: "Cylindrical lithium-ion cell",
        friendlyId: "tc-ec-cell-li-cyl",
        type: schemaIds.techConcept,
        description: `A cylindrical [lithium-ion cell](/entry/${ids.lithiumIonCell}) is a cylindrical [cell](/entry/${ids.lithiumIonCell}) made from a single long "sandwich" of the positive electrode, separator, negative electrode, and insulating sheet which is then rolled and inserted into a hollow cylinder casing. This cell design is often called a "jelly roll" or "swiss roll" because the cross section looks like a swiss roll.`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.lithiumIonCell},
        ],
        props: {
        },
    }),
    // 18650 cell
    ...createEntry({
        id: ids.cell18650,
        name: "18650 cell",
        friendlyId: "tc-ec-cell-18650",
        type: schemaIds.techConcept,
        description: `An 18650 cell is a standard format [cylindrical lithium-ion cell](/entry/${ids.cylindricalLithiumIonCell}), with a diameter of 18mm and a length of 65mm (slightly larger than a AA battery). The 18650 cell features a high storage capacity and can be scaled to form batteries for devices with high power requirements, including Tesla Model X and S vehicles.`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.cylindricalLithiumIonCell},
        ],
        props: {
            [ids.propDiameter]: { valueExpr: `"18 mm"` },
            [ids.propLength]: { valueExpr: `"65 mm"` },
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["18650 battery"]) },
            [ids.propWikidataId]: { valueExpr: `"Q62024169"` },
        },
    }),
    // 2170 cell
    ...createEntry({
        id: ids.cell2170,
        name: "2170 cell",
        friendlyId: "tc-ec-cell-2170",
        type: schemaIds.techConcept,
        description: `The 2170 cell is a [cylindrical lithium-ion cell](/entry/${ids.cylindricalLithiumIonCell}) introduced in 2017 by Panasonic. With a diameter of 21mm and a length of 70mm, it is slightly larger than the standard [18650 cell](/entry/${ids.cell18650}). Due to its larger area and a smaller separation between the anode and cathode, the 2170 boasts a larger capacity than the [18650 cell](/entry/${ids.cell18650}). The 2170 cell is used in the Tesla Model 3 and Y vehicles, and the Tesla Powerwall 2 and Powerpack 2.`,
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.cylindricalLithiumIonCell},
        ],
        props: {
            [ids.propDiameter]: { valueExpr: `"21 mm"` },
            [ids.propLength]: { valueExpr: `"70 mm"` },
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["2170 battery"]) },
        },
    }),
    // Template
    // ...createEntry({
    //     id: ids.TBD_SET_ME,
    //     name: "TBD_SET_ME",
    //     friendlyId: "tc-TBD_SET_ME",
    //     type: schemaIds.techConcept,
    //     description: `TBD_SET_ME`,
    //     rels: [
    //         //{type: schemaIds.techConceptIsA, to: ids.TBD_SET_ME},
    //     ],
    //     props: {
    //         [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["TBD", "TBD", "TBD"]) },
    //         [ids.propWikidataId]: { valueExpr: `"TBD_SET_ME"` },
    //         [ids.propWordNetILI]: { valueExpr: `"TBD_SET_ME"` },
    //     },
    // }),
    // Battery
    ...createEntry({
        id: ids.battery,
        name: "Battery",
        friendlyId: "tc-battery",
        type: schemaIds.techConcept,
        description: `A battery is an assembly of one or more [galvanic cells](/entry/${ids.galvanicCell}) that can be used to power electrical devices using stored energy. The cells are packaged in a container that provides external electrical external connections, usually a positive and a negative terminal.`,
        rels: [
            //{type: schemaIds.techConceptHasPart, to: ids.galvanicCell},
            //{type: schemaIds.techConceptIsA, to: ids.},
            // TODO: a battery is an "electric power source" (which is an "electrical device")
            // TODO: a battery is an "energy storage device"
        ],
        props: {
            [ids.propWikidataId]: { valueExpr: `"Q267298"` },
            [ids.propWordNetILI]: { valueExpr: `"i50578"` },
        },
    }),
    // Photo of a car (Mini Cooper SE)
    ...createEntry({
        id: ids.imgMiniCooperSe,
        name: "Photo of a MINI Cooper SE",
        friendlyId: "img-mini-cooper-se-martin-katler",
        type: schemaIds.image,
        description: "A photo of a MINI Cooper SE, taken by Martin Katler in Bratislava, Slovenia.",
        features: [{featureType: "Image", dataFileId: files.miniCooperSe.id}],
        rels: [
            {type: schemaIds.imgRelatedTo, to: ids.car},
        ],
        props: {
            [ids.propCreator]: { valueExpr: `markdown("[Martin Katler](https://unsplash.com/@martinkatler)")` },
            [ids.propLicense]: { valueExpr: `markdown("[Unsplash License](https://unsplash.com/license)")` },
            [ids.propContentSource]: { valueExpr: `markdown("[Unsplash](https://unsplash.com/photos/a_Fy7a4KO6g)")` },
        },
    }),
    setHeroImage(ids.car, ids.imgMiniCooperSe),
    // Photo of a cylindrical lithium ion battery, showing the "jelly roll" inside.
    ...createEntry({
        id: ids.imgLiIonBatteryJellyRoll,
        name: "18650 cell disassembled",
        friendlyId: "img-18650-disassembled",
        type: schemaIds.image,
        description: `A cylindrical [18650 lithium-ion cell](/entry/${ids.cell18650}) without the casing on, showing the "jelly roll" inside.`,
        features: [{featureType: "Image", dataFileId: files.liIonBatteryJellyRoll.id}],
        rels: [
            {type: schemaIds.imgRelatedTo, to: ids.cell18650},
        ],
        props: {
            [ids.propCreator]: { valueExpr: `markdown("[Rudolf Simon](https://commons.wikimedia.org/wiki/User:RudolfSimon)")` },
            [ids.propLicense]: { valueExpr: `markdown("[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.en)")` },
            [ids.propContentSource]: { valueExpr: `markdown("[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lithium-Ion_Cell_cylindric.JPG)")` },
        },
    }),
    setHeroImage(ids.cylindricalLithiumIonCell, ids.imgLiIonBatteryJellyRoll, `A cylindrical [18650 lithium-ion cell](/entry/${ids.cell18650}) without the casing on, showing the "jelly roll" inside.`),
    // Photo of an 18650 cell
    ...createEntry({
        id: ids.img18650cell,
        name: "18650 cell",
        friendlyId: "img-18650",
        type: schemaIds.image,
        description: `An [18650 cell](/entry/${ids.cell18650}) and an American quarter for scale.`,
        features: [{featureType: "Image", dataFileId: files.cell18650sparkfun.id}],
        rels: [
            {type: schemaIds.imgRelatedTo, to: ids.cell18650},
        ],
        props: {
            [ids.propCreator]: { valueExpr: `markdown("[SparkFun](https://www.sparkfun.com/)")` },
            [ids.propLicense]: { valueExpr: `markdown("[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)")` },
            [ids.propContentSource]: { valueExpr: `markdown("[Sparkfun](https://www.sparkfun.com/products/12895)")` },
        },
    }),
    setHeroImage(ids.cell18650, ids.img18650cell),
];

function createEntry({id, ...args}: {
    id: VNID,
    name: string,
    type: VNID,
    friendlyId: string,
    description?: string,
    features?: schemas.Type<typeof UpdateEntryFeature["dataSchema"]>["feature"][],
    rels?: {type: VNID, to: VNID, noteMD?: string}[],
    props?: Record<VNID, {valueExpr: string, note?: string}>,
}): AnyContentEdit[] {
    const edits: AnyContentEdit[] = [
        {code: "CreateEntry", data: {
            id: id,
            name: args.name,
            type: args.type,
            friendlyId: args.friendlyId,
            description: args.description ?? "",
        }},
    ];
    args.features?.forEach(feature => {
        edits.push({code: "UpdateEntryFeature", data: {
            entryId: id,
            feature,
        }});
    });
    args.rels?.forEach(rel => {
        edits.push({code: "CreateRelationshipFact", data: {
            id: VNID(),
            fromEntry: id,
            toEntry: rel.to,
            type: rel.type,
            noteMD: rel.noteMD,
        }});
    });
    Object.entries(args.props ?? {}).forEach(([propId, prop]) => {
        edits.push({code: "UpdatePropertyValue", data: {
            entry: id,
            property: VNID(propId),
            valueExpression: prop.valueExpr,
            note: prop.note ?? "",
        }});
    });


    return edits;
}

function setHeroImage(entryId: VNID, imageId: VNID, noteMD?: string): AnyContentEdit {
    return {code: "CreateRelationshipFact", data: {
        id: VNID(),
        fromEntry: entryId,
        toEntry: imageId,
        type: schemaIds.hasHeroImage,
        noteMD: noteMD ?? "",
    }};
}
