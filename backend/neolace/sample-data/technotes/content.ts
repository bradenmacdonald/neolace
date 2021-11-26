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
    // Motor Vehicle
    ...createEntry({
        id: ids.motorVehicle,
        name: "Motor Vehicle",
        friendlyId: "tc-motor-vehicle",
        type: schemaIds.techConcept,
        description: "A motor vehicle is a wheeled vehicle that can propel itself and which does not run on rails.",
        props: {
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["automotive vehicle", "self-propelled vehicle"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q1420"` },
            // [schemaIds.propWordNet31SynsetId]: { valueExpr: `"03796768-n"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i56401"` },
        },
    }),
    // Car
    ...createEntry({
        id: ids.car,
        name: "Car",
        friendlyId: "tc-car",
        type: schemaIds.techConcept,
        description: "A car is a motor vehicle with four wheels, used primarily to transport people.",
        props: {
            [schemaIds.propTypeOf]: {valueExpr: `[[/entry/${ids.motorVehicle}]]`},
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["motorcar", "automobile", "auto", "car"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q1420"` },
            // [schemaIds.propWordNet31SynsetId]: { valueExpr: `"02961779-n"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i51496"` },
        },
    }),
    // Electrochemical cell
    ...createEntry({
        id: ids.electrochemicalCell,
        name: "Electrochemical cell",
        friendlyId: "tc-ec-cell",
        type: schemaIds.techConcept,
        description: `An electrochemical cell is a device capable of either generating electrical energy from chemical reactions or using electrical energy to cause chemical reactions. Those which generate electrical energy are called galvanic cells, and are the principal buidling block of [electric batteries](/entry/${ids.battery}).`,
        props: {
            // TODO: is an electric device
            [schemaIds.propWikidataId]: { valueExpr: `"Q80097"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i51687"` },
        },
    }),
    ...createEntry({
        id: ids.galvanicCell,
        name: "Galvanic cell",
        friendlyId: "tc-ec-cell-g",
        type: schemaIds.techConcept,
        description: `A galvanic cell, also known as a voltaic cell, is an [electrochemical cell](/entry/${ids.electrochemicalCell}) that generates electrical energy through chemical reactions, specifically redox reactions. Galvanic cells are the building blocks of [batteries](/entry/${ids.battery}).`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.electrochemicalCell}]]` },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["voltaic cell"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q209440"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i60892"` },
        },
    }),
    // electrolytic cell
    ...createEntry({
        id: ids.electrolyticCell,
        name: "Electrolytic cell",
        friendlyId: "tc-ec-cell-e",
        type: schemaIds.techConcept,
        description: `An electrolytic cell is a [cell](/entry/${ids.electrochemicalCell}) containing an electrolyte in which an applied voltage causes a reaction to occur that would not occur otherwise (such as the breakdown of water into hydrogen and oxygen).`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.electrochemicalCell}]]` },
            [schemaIds.propWikidataId]: { valueExpr: `"Q2608426"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i53363"` },
        },
    }),
    // Primary Cell
    ...createEntry({
        id: ids.primaryCell,
        name: "Primary cell",
        friendlyId: "tc-ec-cell-p",
        type: schemaIds.techConcept,
        description: `A primary cell is a [galvanic cell](/entry/${ids.galvanicCell}) that is designed to be used only once, such as the cells that comprise disposable batteries.`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.galvanicCell}]]` },
            [schemaIds.propWikidataId]: { valueExpr: `"Q1378887"` },
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
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.galvanicCell}]]` },
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.electrolyticCell}]]` },
            // Wikidata doesn't distinguish between "secondary cell" and "rechargeable battery", but WordNet does
            //[schemaIds.propWikidataId]: { valueExpr: `"TBD_SET_ME"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i59635"` },
        },
    }),
    // Lithium-ion cell
    ...createEntry({
        id: ids.lithiumIonCell,
        name: "Lithium-ion cell",
        friendlyId: "tc-ec-cell-li",
        type: schemaIds.techConcept,
        description: `A lithium-ion cell is a [secondary cell](/entry/${ids.secondaryCell}) ("rechargeable battery") that uses a lithium compound as its cathode (positive terminal) material, and typically graphite as the anode (negative terminal) material. Lithium-ion cells feature high energy density and low self-discharge, making them ideal for a variety devices including mobile phones and electric vehicle batteries.`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.secondaryCell}]]` },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["Li-ion cell"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q2822895"` },
        },
    }),
    // cylindrical lithium-ion cell
    ...createEntry({
        id: ids.cylindricalLithiumIonCell,
        name: "Cylindrical lithium-ion cell",
        friendlyId: "tc-ec-cell-li-cyl",
        type: schemaIds.techConcept,
        description: `A cylindrical [lithium-ion cell](/entry/${ids.lithiumIonCell}) is a cylindrical [cell](/entry/${ids.lithiumIonCell}) made from a single long "sandwich" of the positive electrode, separator, negative electrode, and insulating sheet which is then rolled and inserted into a hollow cylinder casing. This cell design is often called a "jelly roll" or "swiss roll" because the cross section looks like a swiss roll.`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.lithiumIonCell}]]` },
        },
    }),
    // 18650 cell
    ...createEntry({
        id: ids.cell18650,
        name: "18650 cell",
        friendlyId: "tc-ec-cell-18650",
        type: schemaIds.techConcept,
        description: `An 18650 cell is a standard format [cylindrical lithium-ion cell](/entry/${ids.cylindricalLithiumIonCell}), with a diameter of 18mm and a length of 65mm (slightly larger than a AA battery). The 18650 cell features a high storage capacity and can be scaled to form batteries for devices with high power requirements, including Tesla Model X and S vehicles.`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.cylindricalLithiumIonCell}]]` },
            [schemaIds.propDiameter]: { valueExpr: `"18 mm"` },
            [schemaIds.propLength]: { valueExpr: `"65 mm"` },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["18650 battery"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q62024169"` },
        },
    }),
    // 2170 cell
    ...createEntry({
        id: ids.cell2170,
        name: "2170 cell",
        friendlyId: "tc-ec-cell-2170",
        type: schemaIds.techConcept,
        description: `The 2170 cell is a [cylindrical lithium-ion cell](/entry/${ids.cylindricalLithiumIonCell}) introduced in 2017 by Panasonic. With a diameter of 21mm and a length of 70mm, it is slightly larger than the standard [18650 cell](/entry/${ids.cell18650}). Due to its larger area and a smaller separation between the anode and cathode, the 2170 boasts a larger capacity than the [18650 cell](/entry/${ids.cell18650}). The 2170 cell is used in the Tesla Model 3 and Y vehicles, and the Tesla Powerwall 2 and Powerpack 2.`,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.cylindricalLithiumIonCell}]]` },
            [schemaIds.propDiameter]: { valueExpr: `"21 mm"` },
            [schemaIds.propLength]: { valueExpr: `"70 mm"` },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["2170 battery"]) },
        },
    }),
    // Template
    // ...createEntry({
    //     id: ids.TBD_SET_ME,
    //     name: "TBD_SET_ME",
    //     friendlyId: "tc-TBD_SET_ME",
    //     type: schemaIds.techConcept,
    //     description: `TBD_SET_ME`,
    //     props: {
    //         [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.parentEntry}]]` },
    //         [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["TBD", "TBD", "TBD"]) },
    //         [schemaIds.propWikidataId]: { valueExpr: `"TBD_SET_ME"` },
    //         [schemaIds.propWordNetILI]: { valueExpr: `"TBD_SET_ME"` },
    //     },
    // }),
    // Battery
    ...createEntry({
        id: ids.battery,
        name: "Battery",
        friendlyId: "tc-battery",
        type: schemaIds.techConcept,
        description: `A battery is an assembly of one or more [galvanic cells](/entry/${ids.galvanicCell}) that can be used to power electrical devices using stored energy. The cells are packaged in a container that provides external electrical external connections, usually a positive and a negative terminal.`,
        props: {
            // TODO: HAS PART galvanic cell, with a SLOT "cell"
            // TODO: a battery is an "electric power source" (which is an "electrical device")
            // TODO: a battery is an "energy storage device"
            [schemaIds.propWikidataId]: { valueExpr: `"Q267298"` },
            [schemaIds.propWordNetILI]: { valueExpr: `"i50578"` },
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
        props: {
            [schemaIds.propImgRelatesTo]: { valueExpr: `[[/entry/${ids.car}]]` },
            [schemaIds.propCreator]: { valueExpr: `markdown("[Martin Katler](https://unsplash.com/@martinkatler)")` },
            [schemaIds.propLicense]: { valueExpr: `markdown("[Unsplash License](https://unsplash.com/license)")` },
            [schemaIds.propContentSource]: { valueExpr: `markdown("[Unsplash](https://unsplash.com/photos/a_Fy7a4KO6g)")` },
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
        props: {
            [schemaIds.propImgRelatesTo]: { valueExpr: `[[/entry/${ids.cell18650}]]` },
            [schemaIds.propCreator]: { valueExpr: `markdown("[Rudolf Simon](https://commons.wikimedia.org/wiki/User:RudolfSimon)")` },
            [schemaIds.propLicense]: { valueExpr: `markdown("[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.en)")` },
            [schemaIds.propContentSource]: { valueExpr: `markdown("[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lithium-Ion_Cell_cylindric.JPG)")` },
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
        props: {
            [schemaIds.propImgRelatesTo]: { valueExpr: `[[/entry/${ids.cell18650}]]` },
            [schemaIds.propCreator]: { valueExpr: `markdown("[SparkFun](https://www.sparkfun.com/)")` },
            [schemaIds.propLicense]: { valueExpr: `markdown("[CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)")` },
            [schemaIds.propContentSource]: { valueExpr: `markdown("[Sparkfun](https://www.sparkfun.com/products/12895)")` },
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
    Object.entries(args.props ?? {}).forEach(([propId, prop]) => {
        edits.push({code: "AddPropertyValue", data: {
            entry: id,
            property: VNID(propId),
            propertyFactId: VNID(),
            valueExpression: prop.valueExpr,
            note: prop.note ?? "",
        }});
    });


    return edits;
}

function setHeroImage(entryId: VNID, imageId: VNID, noteMD?: string): AnyContentEdit {
    return {code: "AddPropertyValue", data: {
        entry: entryId,
        property: schemaIds.propHasHeroImage,
        propertyFactId: VNID(),
        valueExpression: `[[/entry/${imageId}]]`,
        note: noteMD ?? "",
    }};
}
