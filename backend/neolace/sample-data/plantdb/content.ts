import { VNID } from "neolace/deps/vertex-framework.ts";
import { EditList } from "neolace/deps/neolace-api.ts";
import { dedent } from "neolace/lib/dedent.ts";
import { schema } from "./schema.ts";

// All taxonomy data comes from https://www.catalogueoflife.org/

export const entryData = {
    // Our taxonomy tree:
    divisionTracheophyta: { id: VNID(), friendlyId: "d-tracheophyta", name: "Tracheophyta", description: "set below" },
    classPinopsida: { id: VNID(), friendlyId: "c-pinopsida", name: "Pinopsida", description: "set below" },
    orderPinales: { id: VNID(), friendlyId: "o-pinales", name: "Pinales", description: "set below" },
    familyPinaceae: { id: VNID(), friendlyId: "f-pinaceae", name: "Pinaceae", description: "set below" },
    genusPinus: { id: VNID(), friendlyId: "g-pinus", name: "Pinus", description: "set below" },
    ponderosaPine: { id: VNID(), friendlyId: "s-pinus-ponderosa", name: "Ponderosa Pine", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/4J2F3
    stonePine: { id: VNID(), friendlyId: "s-pinus-pinea", name: "Stone Pine", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/77KSK
    jackPine: { id: VNID(), friendlyId: "s-pinus-banksiana", name: "Jack pine", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/4J237
    japaneseRedPine: {
        id: VNID(),
        friendlyId: "s-pinus-densiflora",
        name: "Japanese red pine",
        description: "set below",
    }, // https://www.catalogueoflife.org/data/taxon/4J25P
    japaneseWhitePine: {
        id: VNID(),
        friendlyId: "s-pinus-parviflora",
        name: "Japanese white pine",
        description: "set below",
    }, // https://www.catalogueoflife.org/data/taxon/77KTZ
    jeffreyPine: { id: VNID(), friendlyId: "s-pinus-jeffreyi", name: "Jeffrey pine", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/77KTP
    pinyonPine: { id: VNID(), friendlyId: "s-pinus-cembroides", name: "Pinyon pine", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/4J24K
    westernWhitePine: {
        id: VNID(),
        friendlyId: "s-pinus-monticola",
        name: "Western white pine",
        description: "set below",
    }, // https://www.catalogueoflife.org/data/taxon/4J2CG
    familyCupressaceae: { id: VNID(), friendlyId: "f-cupressaceae", name: "Cupressaceae", description: "set below" },
    genusCupressus: { id: VNID(), friendlyId: "g-cupressus", name: "Cupressus", description: "set below" },
    mediterraneanCypress: {
        id: VNID(),
        friendlyId: "s-cupressus-sempervirens",
        name: "Mediterranean Cypress",
        description: "set below",
    }, // https://www.catalogueoflife.org/data/taxon/32FXZ
    genusThuja: { id: VNID(), friendlyId: "g-thuja", name: "Thuja", description: "set below" },
    westernRedcedar: { id: VNID(), friendlyId: "s-thuja-plicata", name: "Western Redcedar", description: "set below" }, // https://www.catalogueoflife.org/data/taxon/56NTV
    // Plant parts:
    cone: { id: VNID(), friendlyId: "pp-cone", name: "Cone (strobilus)", description: "set below" },
    pollenCone: { id: VNID(), friendlyId: "pp-pollen-cone", name: "Pollen cone", description: "set below" },
    seedCone: { id: VNID(), friendlyId: "pp-seed-cone", name: "Seed cone", description: "set below" },
    // Images:
    imgPonderosaTrunk: {
        id: VNID(),
        friendlyId: "img-lassen-ponderosa",
        name: "Ponderosa Pine Trunk in Lassen Volcanic National Park",
        description: "set below",
    },
};

export const makePlantDbContent: EditList = [
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Create entries for various tree species:
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Create Division/Phylum "Tracheophyta" (vascular plants) - https://www.catalogueoflife.org/data/taxon/TP
    {
        code: "CreateEntry",
        data: {
            ...entryData.divisionTracheophyta,
            type: schema.entryTypes._ETDIVISION.id,
            description:
                (entryData.divisionTracheophyta.description =
                    "Division/phylum ***Tracheophyta*** are the vascular plants."),
        },
    },
    // Create Class "Pinopsida" (conifers) - https://www.catalogueoflife.org/data/taxon/GG
    {
        code: "CreateEntry",
        data: {
            ...entryData.classPinopsida,
            type: schema.entryTypes._ETCLASS.id,
            description: (entryData.classPinopsida.description = "Class ***Pinopsida*** contains all extant conifers."),
        },
    },
    // Class "Pinopsida" IS A member of division "Tracheophyta"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.classPinopsida.id,
            propertyId: schema.properties._parentDivision.id,
            valueExpression: `[[/entry/${entryData.divisionTracheophyta.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Order "Pinales" (conifers) - https://www.catalogueoflife.org/data/taxon/623FD
    {
        code: "CreateEntry",
        data: {
            ...entryData.orderPinales,
            type: schema.entryTypes._ETORDER.id,
            description: (entryData.orderPinales.description = `
                    Order ***Pinales*** contains all extant conifers, such as the [pine family (Pinaceae)](/entry/${entryData.familyPinaceae.id}) and yew family (Taxaceae).
                `.trim()),
        },
    },
    // order "Pinales" IS A member of class "Pinopsida"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.orderPinales.id,
            propertyId: schema.properties._parentClass.id,
            valueExpression: `[[/entry/${entryData.classPinopsida.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Family "Pinaceae" (pine family) - https://www.catalogueoflife.org/data/taxon/625M7
    {
        code: "CreateEntry",
        data: {
            ...entryData.familyPinaceae,
            type: schema.entryTypes._ETFAMILY.id,
            description: (entryData.familyPinaceae.description = `
                        Family ***Pinaceae*** is the **pine family**. It includes cedars, firs, hemlocks, larches, spruces, and of course pines.
                    `.trim()),
        },
    },
    // family "Pinaceae" IS A member of order "Pinales"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.familyPinaceae.id,
            propertyId: schema.properties._parentOrder.id,
            valueExpression: `[[/entry/${entryData.orderPinales.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Genus "Pinus" (pines) - https://www.catalogueoflife.org/data/taxon/6QPY
    {
        code: "CreateEntry",
        data: {
            ...entryData.genusPinus,
            type: schema.entryTypes._ETGENUS.id,
            description: (entryData.genusPinus.description = `
                            Genus ***Pinus***, commonly known as "pines".
                        `.trim()),
        },
    },
    // Genus "Pinus" IS A member of family "Pinaceae"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.genusPinus.id,
            propertyId: schema.properties._parentFamily.id,
            valueExpression: `[[/entry/${entryData.familyPinaceae.id}]]`,
            propertyFactId: VNID(),
        },
    },
    ////////////////////////////////////////////////////////////////////////////////////////////
    // Ponderosa Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.ponderosaPine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.ponderosaPine.description = `
                                ***Pinus ponderosa*** (ponderosa pine) is a species of large pine tree in North America, whose bark resembles puzzle pieces.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.ponderosaPine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.ponderosaPine.id,
            propertyId: schema.properties._propScientificName.id,
            valueExpression: `"Pinus ponderosa"`,
            propertyFactId: VNID(),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.ponderosaPine.id,
            propertyId: schema.properties._propWikidataQID.id,
            valueExpression: `"Q460523"`,
            propertyFactId: VNID(),
        },
    },
    {
        code: "UpdateEntryFeature",
        data: {
            entryId: entryData.ponderosaPine.id,
            feature: {
                featureType: "Article",
                articleMD: dedent`
                                # Description

                                Pinus ponderosa is a large [coniferous](/entry/${entryData.classPinopsida.id}) [pine](/entry/${entryData.genusPinus.id}) tree. The bark helps to distinguish it from other species. Mature to over-mature individuals have yellow to orange-red bark in broad to very broad plates with black crevices. Younger trees have blackish-brown bark, referred to as "blackjacks" by early loggers. Ponderosa pine's five subspecies, as classified by some botanists, can be identified by their characteristically bright-green needles (contrasting with blue-green needles that distinguish [Jeffrey pine](/entry/${entryData.jeffreyPine.friendlyId})). The Pacific subspecies has the longest—7.8 in (19.8 cm)—and most flexible needles in plume-like fascicles of three. The Columbia ponderosa pine has long—4.7–8.1 in (12.0–20.5 cm)—and relatively flexible needles in fascicles of three. The Rocky Mountains subspecies has shorter—3.6–5.7 in (9.2–14.4 cm)—and stout needles growing in scopulate (bushy, tuft-like) fascicles of two or three. The southwestern subspecies has 4.4–7.8 in (11.2–19.8 cm), stout needles in fascicles of three (averaging 2.7–3.5 in (69–89 mm)). The central High Plains subspecies is characterized by the fewest needles (1.4 per whorl, on average); stout, upright branches at narrow angles from the trunk; and long green needles—5.8–7.0 in (14.8–17.9 cm)—extending farthest along the branch, resembling a fox tail. Needles are widest, stoutest, and fewest (averaging 2.2–2.8 in (56–71 mm)) for the species.

                                Sources differ on the scent of P. ponderosa. Some state that the bark smells of turpentine, which could reflect the dominance of terpenes (alpha- and beta-pinenes, and delta-3-carene). Others state that it has no distinctive scent, while still others state that the bark smells like vanilla if sampled from a furrow of the bark. Sources agree that the Jeffrey pine is more strongly scented than the ponderosa pine.

                                ## Size

                                The National Register of Big Trees lists a ponderosa pine that is 235 ft (72 m) tall and 324 in (820 cm) in circumference. In January 2011, a Pacific ponderosa pine in the Rogue River–Siskiyou National Forest in Oregon was measured with a laser to be 268.35 ft (81.79 m) high. The measurement was performed by Michael Taylor and Mario Vaden, a professional arborist from Oregon. The tree was climbed on October 13, 2011, by Ascending The Giants (a tree-climbing company in Portland, Oregon) and directly measured with tape-line at 268.29 ft (81.77 m) high. As of 2015, a Pinus lambertiana specimen was measured at 273.8 ft (83.45 m), which surpassed the ponderosa pine previously considered the world's tallest pine tree.

                                ## Cultivation

                                This species is grown as an ornamental plant in parks and large gardens.

                                # Ecology and distribution

                                Pinus ponderosa is a dominant tree in the Kuchler plant association, the ponderosa shrub forest. Like most western pines, the ponderosa generally is associated with mountainous topography. However, it is found on banks of the Niobrara River in Nebraska. Scattered stands occur in the Willamette Valley of Oregon and in the Okanagan Valley and Puget Sound areas of Washington. Stands occur throughout low level valleys in British Columbia reaching as far north as the Thompson, Fraser and Columbia watersheds. In its Northern limits, it only grows below 1,300 m (4,200 ft) elevation, but is most common below 800 m (2,600 ft). Ponderosa covers 1 million acres (4,000 km2), or 80%, of the Black Hills of South Dakota. It is found on foothills and mid-height peaks of the northern, central, and southern Rocky Mountains, in the Cascade Range, in the Sierra Nevada, and in the maritime-influenced Coast Range. In Arizona, it predominates on the Mogollon Rim and is scattered on the Mogollon Plateau and on mid-height peaks in Arizona and New Mexico. Arizona pine (P. arizonica), found primarily in the mountains of extreme southwestern New Mexico, southeastern Arizona, and northern Mexico and sometimes classified as a variety of ponderosa pine, is presently recognized as a separate species.

                                # Pathology

                                Pinus ponderosa is affected by Armillaria, Phaeolus schweinitzii, Fomes pini, Atropellis canker, dwarf mistletoe, Polyporus anceps, Verticicladiella, Elytroderma needlecast and western gall rust.

                                # Insects

                                It attracts the western pine beetle and mountain pine beetle.

                                # Credit

                                All content in this article is from ["Pinus ponderosa"](https://en.wikipedia.org/wiki/Pinus_ponderosa) on Wikipedia, The Free Encyclopedia.
                            `,
            },
        },
    },
    ////////////////////////////////////////////////////////////////////////////////////////////
    // Stone Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.stonePine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.stonePine.description = `
                                ***Pinus pinea***, known as the **stone pine**, is a pine tree native to the Mediterranean, known and cutivated for their edible pine nuts.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.stonePine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Jack Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.jackPine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.jackPine.description = `
                                ***Pinus banksiana***, commonly called **jack pine**, is a pine tree native to eastern North America.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.jackPine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Japanese Red Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.japaneseRedPine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.japaneseRedPine.description = `
                                ***Pinus densiflora***, also known as the **Japanese red pine**, the **Japanese pine**, or **Korean red pine**, is a species of pine tree native to Japan, the Korean Peninsula, northeastern China and the southeast of Russia.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.japaneseRedPine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Japanese White Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.japaneseWhitePine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.japaneseWhitePine.description = `
                                ***Pinus parviflora***, also known as **Japanese white pine**, **five-needle pine**, or **Ulleungdo white pine**, is a pine tree species native to Korea and Japan.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.japaneseWhitePine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Jeffrey Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.jeffreyPine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.jeffreyPine.description = `
                                ***Pinus jeffreyi***, commonly called the **Jeffrey pine**, is a pine tree found mainly in California as well as surrounding regions.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.jeffreyPine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Pinyon Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.pinyonPine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.pinyonPine.description = `
                                ***Pinus cembroides***, also known as **pinyon pine**, **Mexican nut pine**, and **Mexican stone pine**, is a pine found in North America, primarily in Mexico. It lives in areas with little rainfall, and has edible pine nuts.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.pinyonPine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Western White Pine
    {
        code: "CreateEntry",
        data: {
            ...entryData.westernWhitePine,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.westernWhitePine.description = `
                                ***Pinus monticola***, the **Western white pine** (also called **silver pine**, and **California mountain pine**), is a large pine found in Western Canada and the United States.
                            `.trim()),
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.westernWhitePine.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusPinus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Family "Cupressaceae" (cypress family)
    {
        code: "CreateEntry",
        data: {
            ...entryData.familyCupressaceae,
            type: schema.entryTypes._ETFAMILY.id,
            description: (entryData.familyCupressaceae.description = `
                        Family ***Cupressaceae*** is the **cypress family**. It includes the trees and shrubs with the common name "cypress", as well as several others such as the junipers and redwoods.
                    `.trim()),
        },
    },
    // family "Cupressaceae" IS A member of order "Pinales"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.familyCupressaceae.id,
            propertyId: schema.properties._parentOrder.id,
            valueExpression: `[[/entry/${entryData.orderPinales.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Genus "Cupressus" (cypresses)
    {
        code: "CreateEntry",
        data: {
            ...entryData.genusCupressus,
            type: schema.entryTypes._ETGENUS.id,
            description: (entryData.genusCupressus.description = `
                            Genus ***Cupressus*** contains the conifer species that have the common name "cypress", such as the [mediterranean cypress](/entry/${entryData.mediterraneanCypress.id}).
                        `.trim()),
        },
    },
    // Genus "Cupressus" IS A member of family "Cupressaceae"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.genusCupressus.id,
            propertyId: schema.properties._parentFamily.id,
            valueExpression: `[[/entry/${entryData.familyCupressaceae.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Species "Cupressus sempervirens" - https://www.catalogueoflife.org/data/taxon/32FXZ
    {
        code: "CreateEntry",
        data: {
            ...entryData.mediterraneanCypress,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.mediterraneanCypress.description = `
                                ***Cupressus sempervirens***, the **Mediterranean cypress** is a cypress tree native to the Mediterranean Basin. It grows up to 35m tall and can be very long-lived, with some trees known to be more than 1,000 years old.
                            `.trim()),
        },
    },
    // Species "Cupressus sempervirens" IS A member of genus "Cupressus"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.mediterraneanCypress.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusCupressus.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Genus "Thuja" (arborvitaes)
    {
        code: "CreateEntry",
        data: {
            ...entryData.genusThuja,
            type: schema.entryTypes._ETGENUS.id,
            description: (entryData.genusThuja.description = `
                            Genus ***Thuja*** has several species of coniferous trees that are part of the cypress family. Thujas are commonly known as Members are commonly known as **arborvitaes** or **cedars**, although they should not be confused with true cedars, a separate genus.
                        `.trim()),
        },
    },
    // Genus "Thuja" IS A member of family "Cupressaceae"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.genusThuja.id,
            propertyId: schema.properties._parentFamily.id,
            valueExpression: `[[/entry/${entryData.familyCupressaceae.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Create Species "Thuja plicata" - https://www.catalogueoflife.org/data/taxon/56NTV
    {
        code: "CreateEntry",
        data: {
            ...entryData.westernRedcedar,
            type: schema.entryTypes._ETSPECIES.id,
            description: (entryData.westernRedcedar.description = `
                                ***Thuja plicata***, the **western redcedar**, is a large conifer that is among the most widespread trees in the Pacific Northwest.
                            `.trim()),
        },
    },
    // Species "Thuja plicata" IS A member of genus "Thuja"
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.westernRedcedar.id,
            propertyId: schema.properties._parentGenus.id,
            valueExpression: `[[/entry/${entryData.genusThuja.id}]]`,
            propertyFactId: VNID(),
        },
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Create entries about the cones (strobilus/strobili) that conifers have:
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Cone - https://en.wikipedia.org/wiki/Conifer_cone
    {
        code: "CreateEntry",
        data: {
            ...entryData.cone,
            type: schema.entryTypes._ETPLANTPART.id,
            description: (entryData.cone.description = `
            A **cone** (formally "strobilus") is a reproductive organ found on conifers.
        `.trim()),
        },
    },
    // Male cone (pollen cone)
    {
        code: "CreateEntry",
        data: {
            ...entryData.pollenCone,
            type: schema.entryTypes._ETPLANTPART.id,
            description: (entryData.pollenCone.description = `
                A **pollen cone** or **male cone** (formally "microstrobilus") is a small reproductive organ bearing pollen found on conifers, not to be confused with the familiar [seed cone](/entry/${entryData.seedCone.id}).
            `.trim()),
        },
    },
    // A male cone is a type of cone
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.pollenCone.id,
            propertyId: schema.properties._partIsAPart.id,
            valueExpression: `[[/entry/${entryData.cone.id}]]`,
            propertyFactId: VNID(),
        },
    },
    // Female cone (seed cone), what you think of as a "pine cone"
    {
        code: "CreateEntry",
        data: {
            ...entryData.seedCone,
            type: schema.entryTypes._ETPLANTPART.id,
            description: (entryData.seedCone.description = `
                A **seed cone** or **female cone** (formally "megastrobilus") is a varied reproductive organ found on conifers. Examples include the well-known "pine cone".
            `.trim()),
        },
    },
    // A female cone is a type of cone
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.seedCone.id,
            propertyId: schema.properties._partIsAPart.id,
            valueExpression: `[[/entry/${entryData.cone.id}]]`,
            propertyFactId: VNID(),
        },
    },

    // All conifers (Class Pinopsida) have both male and female cones:
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.classPinopsida.id,
            propertyId: schema.properties._hasPart.id,
            valueExpression: `[[/entry/${entryData.pollenCone.id}]]`,
            propertyFactId: VNID(),
            slot: "pollen-cone",
        },
    },
    {
        code: "AddPropertyValue",
        data: {
            entryId: entryData.classPinopsida.id,
            propertyId: schema.properties._hasPart.id,
            valueExpression: `[[/entry/${entryData.seedCone.id}]]`,
            propertyFactId: VNID(),
            slot: "seed-cone",
        },
    },
];
