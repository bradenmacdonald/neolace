import { VNID, } from "neolace/deps/vertex-framework.ts";
import { AnyContentEdit, UpdateEntryFeature, schemas } from "neolace/deps/neolace-api.ts";
import { schemaIds } from "./schema.ts";
import { files } from "./datafiles.ts";
import { dedent } from "neolace/lib/dedent.ts";

export const ids = {
    // Internal IDs used for each entry, in alphabetical order
    // "Normally" it's not necessary to specify these (they're auto-generated behind the scenes) but because of how
    // we're working at the moment by erasing the database and re-creating all entries, it's important to ensure the
    // internal IDs used are consistent each time.
    battery: VNID("_5HYZND6114KVUtCGjFC8mT"),
    batteryAA: VNID("_1bWGkkQDaPxHwmcMkO5cbu"),
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
    imgAABattery: VNID("_1nmqoMNKS0MYZRjjzUiQd3"),
    imgHomeLogoNRC: VNID("_3FBIrCRwznnyPOo0Ln3Zf0"),
    imgHomeLogoILab: VNID("_4kfv0p8IFnzOOOdjmJRw4E"),
    imgHomeLogoSandbox: VNID("_4OPh7CUZA88UKYakBM2NUK"),
    imgLiIonBatteryJellyRoll: VNID("_52FWviI73eaW6sIO8sZx0F"),
    imgMiniCooperSe: VNID("_5hqETvE3WTHuYvhHbwWuD"),
    imgTeamBraden: VNID("_2jhlA8cESf5nD9dlURERw5"),
    imgTeamJoel: VNID("_5IgIEXFV54PUucrhcKN26E"),
    imgTeamJeff: VNID("_1HKE5qN2QazUiSYdvuEfjz"),
    primaryCell: VNID("_7OCTF7b5Z4wM7KvEE16OtK"),
    productPanasonicNCR18650B: VNID("_3KPUsKAzTQZ6ZJT05VvagC"),
    productTesla18650cell: VNID("_5QZEkrIjvgA7y3iP9qSEVi"),
    productTesla60BatteryModule: VNID("_1bquO1r9lmemPkQixL2eXT"),
    productTesla85Battery: VNID("_5Z7bPDS8qOWy1DUHwpehjS"),
    productTesla85BatteryModule: VNID("_6dF6GUIrPx8ToREmsFAZ5R"),
    secondaryCell: VNID("_4HwJfgRjCzfOI7z2XTzY0r"),
    standarizedBattery: VNID("_51YyfHlwYxW1X5QfjRBai6"),
    technotesAbout: VNID("_6zvYuCnfuiQKEWHff2rWC2"),
    technotesTeam: VNID("_2G5LENTkqIXwRZkOD2xDRa"),
    //spare: VNID("_1CZTpr2BFC76f54Q3vNuB4"),
    //spare: VNID("_7L82mzuTE4VBE7qtgSCw5q"),
    //spare: VNID("_4039TU7Xn7xYBEvhtzA65D"),
    //spare: VNID("_4R4bJmIhMJiQ5bXALcYmz1"),
    //spare: VNID("_1X8ysL1NXDrJv2XDYmXRua"),
    //spare: VNID("_yP5CLTAiFrhoCOtFkpsS2"),
    //spare: VNID("_7J1EEePxd3wm8gfRFUDpML"),
    //spare: VNID("_3Zw5NqCBkoTQZXT7LjLqVe"),
    //spare: VNID("_3YpHBvg2F7BaDUGHzUl5js"),
    //spare: VNID("_516aUfKmnKsrsUZRnnR0BI"),
    //spare: VNID("_708vyHRgZpnr7bRkiBswtT"),
    // To generate more IDs:
    // From backend, run "deno", then
    //  import { VNID } from "./neolace/deps/vertex-framework.ts";
    // then
    //  new Array(20).fill(undefined).map(_ => VNID()).forEach(v => console.log(`//spare: VNID("${v}"),`))
};

export const edits: AnyContentEdit[] = [
    // TechNotes Team
    ...createEntry({
        id: ids.technotesTeam,
        name: "TechNotes Team",
        friendlyId: "team",
        type: schemaIds.technotesMetaPage,
        description: "The team behind TechNotes.",
        props: {},
        features: [
            {featureType: "Article", articleMD: dedent`
                { [[/entry/${ids.imgTeamBraden}]].image(format="right") }

                # Braden MacDonald, *CEO*

                Braden is a software developer and technology enthusiast. He is the co-founder and CEO of [TechNotes](https://www.technotes.org) and the CTO of [OpenCraft](https://opencraft.com/). Prior to TechNotes, Braden's most recent major project was [LabXchange](https://www.labxchange.org/), an online platform from Harvard University which provides world-class life sciences education materials to the world on-demand and for free. Braden led the software development for the project, which went on to have over two million users in its first year and won the 2020 Open edX Prize for creating the most impactful technical project built with Open edX.

                An avid programmer since childhood, Braden has worked with a wide variety of projects, platforms, and programming languages over the years. Braden is known for his deep technical knowledge, his wide-ranging experience, his approach to understanding problems from many perspectives, his ability to communicate clearly, and his relentless optimism.

                Outside of work, Braden has enjoyed serving on several non-profit boards, notably the OGO Car Share Co-op which brought car sharing to BC's Okanagan Valley and was acquired by [Modo](https://modo.coop/). Braden holds an Honours B.Sc. in Physics from the University of British Columbia.

                { [[/entry/${ids.imgTeamJoel}]].image(format="right") }

                # Joel Krupa, *COO*

                Joel started his career as an intern in the office of former California Governor Arnold Schwarzenegger. He went on to hold senior roles in both private sector and public sector clean energy and technology organizations. In parallel with this work, he has maintained an academic career that included teaching numerous undergraduate classes, publishing 10 energy-related academic papers, and writing over 50 book reviews on a range of technical and popular topics.

                Joel completed a postdoctoral fellowship at Harvard Engineering after earning a B.A. at the University of British Columbia, a B.Sc. at the London School of Economics, an M.Sc. at the University of Oxford, and a Ph.D. at the University of Toronto. He has undertaken visiting research appointments at research centres affiliated with Imperial College London and the University of Oxford.

                { [[/entry/${ids.imgTeamJeff}]].image(format="right") }

                # Jeff Krupa, *VP Content & Partnerships*

                Jeff Krupa is a PhD candidate in high energy physics at MIT. His research focuses on AI and the analysis of large datasets. He's interested in existential risks including climate change and excited about delivering technological solutions via accelerated innovation.
            `},
        ],
    }),
    // About TechNotes
    ...createEntry({
        id: ids.technotesAbout,
        name: "About TechNotes",
        friendlyId: "about",
        type: schemaIds.technotesMetaPage,
        description: `
            TechNotes is an open engineering library focused on clean tech - specifically electric vehicle (EV) and
            battery technology. Our goal is to combine data, reference articles, design examples, datasets, patents,
            technical drawings, and discussion forums together in one integrated resource that's exceptionally easy to
            use and well-organized.
        `,
        props: {},
        features: [
            {featureType: "Article", articleMD: dedent`            
            # Long-term Vision

            Our long-term vision is to build an authoritative, free, collaboratively developed online library of
            detailed and practical information about engineering and technology. This website would be somewhat
            analogous to Wikipedia or Wikidata, but focused entirely on technology and built with different content and
            capabilities.
            
            **Mission statement: to accelerate and protect humanity’s technological advancement by providing a
            comprehensive, open, and practical library of technological knowledge.**

            # Goals

            The goals for this project are:
            
            1. To accelerate the pace of technological and scientific innovation

               *Humanity has a lot of knowledge about how to build amazing things, but much of it is not easily accessible - available only from specialist books, obscure research papers, internal corporate documents, and in-person instruction. This is especially true of the hard-won practical advice that is necessary to go beyond theory and actually build things yourself.*
            
            2. To make all of its information easily discoverable, cross-referenced, in standardized formats, and as accessible as possible

               *Here accessible means both to humans and to machines.*
            
            3. To promote standardization, collaboration, and open standards
            
            4. To create a single resource that contains enough in-depth engineering and technological information to build a modern technological civilization from scratch
            
               *If humans had to abandon earth and land on another habitable planet, TechNotes would provide the knowledge needed to quickly build mines, factories, power sources, habitats, and (eventually) things like smart phones. This scenario is hopefully never going to occur, but any resource which meets that aspirational goal would provide countless very real benefits here and now.*
            
            5. To collaboratively develop and publish open-source ready-to-use designs for important tools, devices, and technologies
            
               *If an engineer were asked to design a lightweight habitat that humans could live in on Mars, instead of having to design everything from scratch, her team could start by downloading complete plans for things like washing machines, lighting fixtures, microwaves, smoke detectors, door locks, etc., then modify them to be as simple and lightweight as possible, then print/order the components - creating a much more complete and functional habitat in a fraction of the time as would otherwise be possible. And of course, the community could continue to iterate on and improve these Mars design variants.*
            
            6. To preserve detailed knowledge of now-obsolete technologies
            
               *Why? For historical purposes, to avoid any loss of technological capability, to serve as inspiration for future discoveries, and to be used if needed to rebuild civilization after an apocalypse.*
            `},
        ],
    }),
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
        description: dedent`
            An 18650 cell is a standard format [cylindrical lithium-ion](/entry/${ids.cylindricalLithiumIonCell})
            [cell](/entry/${ids.secondaryCell}), with a diameter of {this.get(prop=[[/prop/${schemaIds.propDiameter}]])}
            and a length of {this.get(prop=[[/prop/${schemaIds.propLength}]])} (slightly larger than a
            [AA battery](/entry/${ids.batteryAA})).
            The 18650 cell has been used since the late 1990s and has been popular for a wide range of applications that
            require a rechargeable battery - such as flashlights, laptops, power tools, and even electric vehicles. Due
            to the popularity of the 18650 cell, they are usually an easily available, well-understood, and affordable
            option.
        `,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.cylindricalLithiumIonCell}]]` },
            [schemaIds.propDiameter]: { valueExpr: `"18 mm"` },
            [schemaIds.propLength]: { valueExpr: `"65 mm"`, note: "Though cells with built-in protection circuit may be longer." },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["18650 battery"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q62024169"` },
            [schemaIds.propVoltageNominal]: { valueExpr: `"3.7 V"` },
            [schemaIds.propVoltageRange]: { valueExpr: `"2.5 - 4.2 V"` },
        },
        features: [
            {featureType: "Article", articleMD: dedent`
                # Applications

                A single 18650 cell is often used as the rechargeable battery for flashlights and e-cigarettes.

                When combined together to create a multi-cell [battery](/entry/${ids.battery}), 18650 cells are used for:
                * power tools
                * e-bikes
                * electric vehicles
                * notebook computers (though today many notebooks use lithium polymer cells instead, which allow for a
                  thinner form factor)


                # In depth

                ## Protection circuits

                18650 cells are available as either "unprotected" or "protected" cells. The protected cells have a
                built-in circuit within the cell package that protects against potentially dangerous situations like
                over charges, over discharges, and short circuits - any of which can potentially lead the cell to
                burst, overheat, or catch fire.

                # Known issues

                ## Length variations

                Although the 18650 cell is a standard size (the dimensions in millimeters are in the name itself), cells
                with integrated [protection circuits](#h-protection-circuits) are often longer than the standard 65mm.
                Such protected cells usually fit in holders that use spring-loaded or flexible metal contacts, but other
                holder designs or battery pack formats may not fit them if they are designed for the standard 65mm
                length.

                ${/*# Manufacturing

                Lorem ipsum...

                # Lifecycle

                Lorem ipsum...

                # Impact

                Lorem ipsum...*/""}

            `},
        ],
    }),
    // 2170 cell
    ...createEntry({
        id: ids.cell2170,
        name: "2170 cell",
        friendlyId: "tc-ec-cell-2170",
        type: schemaIds.techConcept,
        description: `The 2170 cell is a [cylindrical lithium-ion](/entry/${ids.cylindricalLithiumIonCell}) [cell](/entry/${ids.secondaryCell}) introduced in 2017 by Panasonic. With a diameter of 21mm and a length of 70mm, it is slightly larger than the standard [18650 cell](/entry/${ids.cell18650}). Due to its larger area and a smaller separation between the anode and cathode, the 2170 boasts a larger capacity than the [18650 cell](/entry/${ids.cell18650}). The 2170 cell is used in the Tesla Model 3 and Y vehicles, and the Tesla Powerwall 2 and Powerpack 2.`,
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
    // Standardized battery
    ...createEntry({
        id: ids.standarizedBattery,
        name: "Standardized battery",
        friendlyId: "tc-battery-std",
        type: schemaIds.techConcept,
        description: `
            A **standardized battery** is a [battery](/entry/${ids.battery}) that is designed and manufactured according
            to an international standard. The standard will usually specify the battery's size and shape. Often the
            standard will also specify the nominal voltage and the exact battery chemistry as well.
        `,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.battery}]]` },
            [schemaIds.propWikidataId]: { valueExpr: `"Q4374872"` },
        },
    }),
    // AA Battery
    ...createEntry({
        id: ids.batteryAA,
        name: "AA Battery",
        friendlyId: "tc-batt-aa",
        type: schemaIds.techConcept,
        description: `
            An **AA battery** is a standard cylindrical single-[cell](/entry/${ids.galvanicCell}) [battery](/entry/${ids.battery})
            with diameter 14.5 mm and length 50.5 mm. Commonly used in consumer electronic devices, the AA battery may
            be [primary](/entry/${ids.primaryCell}) (single-use) or [secondary](/entry/${ids.secondaryCell})
            (multi-use). AA batteries are manufactured with many different chemical compositions, some of which include
            zinc-carbon, zinc-chloride, nickel-cadmium, and lithium-ion. The voltage of the battery depends on the
            chemistry but is usually either 1.5 V or 1.2 V.
        `,
        props: {
            [schemaIds.propTypeOf]: { valueExpr: `[[/entry/${ids.standarizedBattery}]]` },
            [schemaIds.propAlsoKnownAs]: { valueExpr: JSON.stringify(["double-A battery", "R6 battery", "size 15 battery", "UM-3 battery"]) },
            [schemaIds.propWikidataId]: { valueExpr: `"Q1195592"` },
            [schemaIds.propDiameter]: { valueExpr: `"14.5 mm"` },
            [schemaIds.propLength]: { valueExpr: `"50.5 mm"` },
        },
    }),


    // Panasonic cell
    ...createEntry({
        id: ids.productPanasonicNCR18650B,
        name: "Panasonic NCR18650B",
        friendlyId: "p-pnsnc-ncr18650b",
        type: schemaIds.product,
        description: `The **Panasonic NCR18650B** is a [18650 cylindrical lithium-ion](/entry/${ids.cell18650}) [cell](/entry/${ids.secondaryCell}) sold by Panasonic.`,
        props: {
            [schemaIds.propProductTypeOf]: {valueExpr: `[[/entry/${ids.cell18650}]]`},
            [schemaIds.propVoltageNominal]: {valueExpr: `"3.6 V"`},
            [schemaIds.propVoltageRange]: { valueExpr: `"2.5 - 4.2 V"` },
            [schemaIds.propBatteryCapacity]: {valueExpr: `"3350 mAh"`, note: "at 25°C"},
            [schemaIds.propDiameter]: {valueExpr: `"18.63 mm"`},
            [schemaIds.propLength]: {valueExpr: `"65.08 mm"`},
        },
    }),


    // Tesla products
    ...createEntry({
        id: ids.productTesla18650cell,
        name: "Tesla 18650 cell",
        friendlyId: "p-tesla-18650",
        type: schemaIds.product,
        description: `The **Tesla 18650 cell** is a proprietary [18650 cylindrical lithium-ion](/entry/${ids.cell18650}) [cell](/entry/${ids.secondaryCell}) developed by Tesla and Panasonic. It is thought to be similar to the [Panasonic NCR18650B cell](/entry/${ids.productPanasonicNCR18650B}) (but testing [has shown it differs](https://teslamotorsclub.com/tmc/threads/teslas-85-kwh-rating-needs-an-asterisk-up-to-81-kwh-with-up-to-77-kwh-usable.61896/) from that cell).`,
        props: {
            [schemaIds.propProductTypeOf]: {valueExpr: `[[/entry/${ids.cell18650}]]`},
            // Per https://teslamotorsclub.com/tmc/threads/teslas-85-kwh-rating-needs-an-asterisk-up-to-81-kwh-with-up-to-77-kwh-usable.61896/ :
            [schemaIds.propEnergyCapacity]: {valueExpr: `"11.36 Wh"`},
            [schemaIds.propVoltageNominal]: {valueExpr: `"3.6 V"`, note: "Assumed"},
            [schemaIds.propBatteryCapacity]: {valueExpr: `"3155 mAh"`, note: "Calculated based on measured energy capacity and assumed voltage."},
        },
    }),
    ...createEntry({
        id: ids.productTesla85BatteryModule,
        name: "Tesla 18650 battery module (5kWh)",
        friendlyId: "p-tesla-b85-mod",
        type: schemaIds.product,
        description: `This battery module contains 444 [18650 cells](/entry/${ids.cell18650}) arranged in a 74p6s configuration (74 cells in parallel, 6 cells in series).`,
        props: {
            [schemaIds.propHasPart]: {valueExpr: `[[/entry/${ids.productTesla18650cell}]]`},
            // Information from http://evbimmer325i.blogspot.com/2016/12/tesla-battery-modules-overview.html
            // Seems more accurate than other info at http://media3.ev-tv.me/TeslaModuleController.pdf
            [schemaIds.propVoltageNominal]: {valueExpr: `"21.6V"`},
            [schemaIds.propPartNumber]: [{valueExpr: `"1009312-00-E"`}],
            [schemaIds.propBatteryCapacity]: {valueExpr: `"233 Ah"`, note: "Exact capacity is unknown as it is not published by the manufacturer, but it should be 74x the capacity of the cells used (e.g. 3155 mAh)."},
            [schemaIds.propEnergyCapacity]: {valueExpr: `"5.0 kWh"`},
            // Apparently 1009312-00-E is associated with 1014114-00-D
            // Note: 1009312-20-A and 1009312-20-B are associated with a 60kWh battery pack module, not this one.
        },
    }),
    ...createEntry({
        id: ids.productTesla60BatteryModule,
        name: "Tesla 18650 battery module (4kWh)",
        friendlyId: "p-tesla-b60-mod",
        type: schemaIds.product,
        description: `This battery module contains 384 [18650 cells](/entry/${ids.cell18650}) arranged in a 64p6s configuration (64 cells in parallel, 6 cells in series).`,
        props: {
            [schemaIds.propHasPart]: {valueExpr: `[[/entry/${ids.productTesla18650cell}]]`},
            [schemaIds.propVoltageNominal]: {valueExpr: `"21.6V"`},
            [schemaIds.propVoltageRange]: { valueExpr: `"18 - 25.2 V"`},
            [schemaIds.propPartNumber]: [{valueExpr: `"1009312-20-A"`}, {valueExpr: `"1009312-20-B"`}],
            [schemaIds.propBatteryCapacity]: {valueExpr: `"202 Ah"`, note: "Exact capacity is unknown as it is not published by the manufacturer, but it should be 64x the capacity of the cells used (e.g. 3155 mAh)."},
            [schemaIds.propEnergyCapacity]: {valueExpr: `"4.36 kWh"`},
        },
    }),
    ...createEntry({
        id: ids.productTesla85Battery,
        name: "Tesla 85kWh Battery (v1, Model S, RWD)",
        friendlyId: "p-tesla-batt-85-1",
        type: schemaIds.product,
        description: `The Tesla 85kWh High Voltage Battery Assembly is an 85kWh battery used in Tesla Model S vehicles from 2012 until about 2015.`,
        props: {
            [schemaIds.propHasPart]: {valueExpr: `[[/entry/${ids.productTesla85BatteryModule}]]`, note: `Each battery assembly contains 16 of these modules.`},
            [schemaIds.propPartNumber]: [
                // P/N 1014114 is described as "ASY,HV BATTERY,S3,MDLS" and is a new 85 kWh pack
                {valueExpr: `"1014114-00-A"`, note: "Limited to 90 kW Supercharging"},
                {valueExpr: `"1014114-00-B"`, note: "Supports 120 kW Supercharging"},
                //{valueExpr: `"1014114-00-D"`}, - unclear if this is v1 or v1.5
                //{valueExpr: `"1014114-00-E"`}, - unclear if this is v1 or v1.5
                {valueExpr: `"1014114-00-F"`, note: "Supports 120 kW Supercharging"},
                // Remanufactured 1038596 versions:
                {valueExpr: `"1038596-##-A"`, note: "Remanufactured, limited to 90 kW Supercharging. The style code (##) varies and is used to indicate the battery capacity at the time of remanufacturing."},
                {valueExpr: `"1038596-##-B"`, note: "Remanufactured, supports 120 kW Supercharging. The style code (##) varies and is used to indicate the battery capacity at the time of remanufacturing."},
                {valueExpr: `"1038596-##-D"`, note: "Remanufactured, supports 120 kW Supercharging. The style code (##) varies and is used to indicate the battery capacity at the time of remanufacturing."},
                {valueExpr: `"1038596-##-E"`, note: "Remanufactured, supports 120 kW Supercharging. The style code (##) varies and is used to indicate the battery capacity at the time of remanufacturing."},
                // Remanufactured 1025273 versions:
                {valueExpr: `"1025273-##-A"`, note: "Remanufactured, limited to 90 kW Supercharging. The style code (##) varies and is used to indicate the battery capacity at the time of remanufacturing."},
                // {valueExpr: `"1025273-##-B"`, note: "Remanufactured"},
                // {valueExpr: `"1025273-##-D"`, note: "Remanufactured"},
                // {valueExpr: `"1025273-##-E"`, note: "Remanufactured"},
            ],
            [schemaIds.propVoltageNominal]: {valueExpr: `"400V"`},
            [schemaIds.propPartName]: {valueExpr: `"ASY,HV BATTERY,S3,MDLS"`},
            [schemaIds.propPartDesc]: {valueExpr: `"HIGH VOLTAGE BATTERY ASSEMBLY - 1.0 - MODEL S, 85KWH, RWD"`},
            // Actual energy capacity - see https://teslamotorsclub.com/tmc/threads/teslas-85-kwh-rating-needs-an-asterisk-up-to-81-kwh-with-up-to-77-kwh-usable.61896/
            [schemaIds.propEnergyCapacity]: {valueExpr: `"80.7 kWh"`, note: "Despite the 85kWh name, actual measured capacity seems to be slightly lower."},
        },
    }),
    /*
    P/N 1031043 is described as "ASY,HV BATTERY,S3BB,DUAL MTR,MDLS" and is a new 85 kWh pack for dual-motor operation
    P/N 1055519 is described as "ASY,HV BATTERY,S3,DUAL MTR,MDLS" and is a new 85 kWh pack for dual-motor operation
    */



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
    // Photo of an AA battery
    ...createEntry({
        id: ids.imgAABattery,
        name: "AA Battery",
        friendlyId: "img-aa",
        type: schemaIds.image,
        description: `An [AA battery](/entry/${ids.batteryAA}).`,
        features: [{featureType: "Image", dataFileId: files.aaBattery.id}],
        props: {
            [schemaIds.propImgRelatesTo]: { valueExpr: `[[/entry/${ids.batteryAA}]]` },
            [schemaIds.propCreator]: { valueExpr: `markdown("[Asim Saleem](https://commons.wikimedia.org/wiki/User:Asim18)")` },
            [schemaIds.propLicense]: { valueExpr: `markdown("[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)")` },
            [schemaIds.propContentSource]: { valueExpr: `markdown("[Wikimedia Commons](https://commons.wikimedia.org/wiki/File:02_-_Single_Energizer_Battery.jpg)")` },
        },
    }),
    setHeroImage(ids.batteryAA, ids.imgAABattery),
    setHeroImage(ids.standarizedBattery, ids.imgAABattery),
    setHeroImage(ids.battery, ids.imgAABattery),

    // Photo of Braden
    ...createEntry({
        id: ids.imgTeamBraden,
        name: "photo of Braden MacDonald",
        friendlyId: "img-technotes-braden",
        type: schemaIds.image,
        description: `Photo of TechNotes co-founder, Braden MacDonald`,
        features: [{featureType: "Image", dataFileId: files.teamBraden.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Please contact TechNotes if you wish to use this image anywhere other than within TechNotes itself."` },
        },
    }),
    // Photo of Joel
    ...createEntry({
        id: ids.imgTeamJoel,
        name: "Photo of Joel Krupa",
        friendlyId: "img-technotes-joel",
        type: schemaIds.image,
        description: `Photo of TechNotes co-founder, Joel Krupa`,
        features: [{featureType: "Image", dataFileId: files.teamJoel.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Please contact TechNotes if you wish to use this image anywhere other than within TechNotes itself."` },
        },
    }),
    // Photo of Jeff
    ...createEntry({
        id: ids.imgTeamJeff,
        name: "Photo of Jeff Krupa",
        friendlyId: "img-technotes-jeff",
        type: schemaIds.image,
        description: `Photo of TechNotes co-founder, Jeff Krupa`,
        features: [{featureType: "Image", dataFileId: files.teamJeff.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Please contact TechNotes if you wish to use this image anywhere other than within TechNotes itself."` },
        },
    }),
    // NRC Logo
    ...createEntry({
        id: ids.imgHomeLogoNRC,
        name: "National Research Council of Canada logo",
        friendlyId: "img-home-logo-nrc",
        type: schemaIds.image,
        description: `National Research Council of Canada logo`,
        features: [{featureType: "Image", dataFileId: files.homeLogoNRC.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Used with permission."` },
        },
    }),
    // Harvard i-lab Logo
    ...createEntry({
        id: ids.imgHomeLogoILab,
        name: "Harvard Innovation Labs Logo",
        friendlyId: "img-home-logo-i-lab",
        type: schemaIds.image,
        description: `Harvard Innovation Labs Logo`,
        features: [{featureType: "Image", dataFileId: files.homeLogoILab.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Used with permission."` },
        },
    }),
    // MIT Sandbox logo
    ...createEntry({
        id: ids.imgHomeLogoSandbox,
        name: "MIT Sandbox Logo",
        friendlyId: "img-home-logo-sandbox",
        type: schemaIds.image,
        description: `MIT Sandbox Logo`,
        features: [{featureType: "Image", dataFileId: files.homeLogoSandbox.id}],
        props: {
            [schemaIds.propLicense]: { valueExpr: `"All rights reserved. Used with permission."` },
        },
    }),
];

function createEntry({id, ...args}: {
    id: VNID,
    name: string,
    type: VNID,
    friendlyId: string,
    description?: string,
    features?: schemas.Type<typeof UpdateEntryFeature["dataSchema"]>["feature"][],
    props?: Record<VNID, {valueExpr: string, note?: string}|{valueExpr: string, note?: string}[]>,
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
        const propValues = Array.isArray(prop) ? prop : [prop];
        propValues.forEach(pv => {
            edits.push({code: "AddPropertyValue", data: {
                entry: id,
                property: VNID(propId),
                propertyFactId: VNID(),
                valueExpression: pv.valueExpr,
                note: pv.note ?? "",
            }});
        });
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
