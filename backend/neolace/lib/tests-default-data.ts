// deno-lint-ignore-file no-explicit-any
import * as log from "std/log/mod.ts";
import { ContentType, RelationshipCategory } from "neolace/deps/neolace-api.ts";
import { VNID, VertexTestDataSnapshot } from "neolace/deps/vertex-framework.ts";

import { graph } from "neolace/core/graph.ts";
import { CreateBot, CreateUser } from "../core/User.ts";
import { CreateSite, AccessMode } from "neolace/core/Site.ts";
import { CreateGroup } from "neolace/core/Group.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";


// Data that gets created by default. 
// To access this, use the return value of setTestIsolation(setTestIsolation.levels.DEFAULT_...)
const data = {
    users: {
        admin: {
            email: "alex@example.com",
            fullName: "Alex Admin",
            username: "alex",
            id: undefined as any as VNID,  // will be set once created.
            bot: {
                username: "alex-bot",
                fullName: "Alex Bot 1",
                id: undefined as any as VNID,  // will be set once created.
                authToken: undefined as any as string,  // will be set once created.
            }
        },
        regularUser: {
            email: "jamie@example.com",
            fullName: "Jamie User",
            username: "jamie",
            id: undefined as any as VNID,  // will be set once created.
        },
    },
    // A Site, with Alex as the admin and Jamie as a regular user
    site: {
        name: "PlantDB",
        domain: "plantdb.local.neolace.net",
        shortId: "plantdb",
        // The site will default to "PublicContributions" access mode. To test different access modes, update the site's access mode in your test case.
        initialAccessMode: AccessMode.PublicContributions as const,
        id: undefined as any as VNID,  // will be set once created.
        adminsGroupId: undefined as any as VNID,  // will be set once created.
        usersGroupId: undefined as any as VNID,  // will be set once created.
    },
    schema: {
        entryTypes: {
            "_ETDIVISION": {
                id: VNID("_ETDIVISION"),
                name: "Division",
                contentType: ContentType.Article,
                description: "A division (also called Phylum outside of botany) is the main taxonomic classification within the Plant Kingdom.",
                friendlyIdPrefix: "d-",
                simplePropValues: {
                    "_CFDivisionClasses": {id: VNID("_CFDivisionClasses"), label: "Classes", importance: 6, valueExpression: `this.related(via=RT[_CisD])`, note: ""},
                },
            },
            "_ETCLASS": {
                id: VNID("_ETCLASS"),
                name: "Class",
                contentType: ContentType.Article,
                description: "A class is a level of taxonomic classification between Division/Phylum and Order.",
                friendlyIdPrefix: "c-",
                simplePropValues: {
                    "_CFClassTaxonomy": {id: VNID("_CFClassTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                    "_CFClassOrders": {id: VNID("_CFClassOrders"), label: "Orders", importance: 6, valueExpression: `this.related(via=RT[_OisC])`, note: ""},
                    "_CFClassParts": {id: VNID("_CFClassParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETORDER": {
                id: VNID("_ETORDER"),
                name: "Order",
                contentType: ContentType.Article,
                description: "An order is a level of taxonomic classification between Class and Family.",
                friendlyIdPrefix: "o-",
                simplePropValues: {
                    "_CFOrderTaxonomy": {id: VNID("_CFOrderTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                    "_CFOrderFamilies": {id: VNID("_CFOrderFamilies"), label: "Families", importance: 6, valueExpression: `this.related(via=RT[_FisO])`, note: ""},
                    "_CFOrderParts": {id: VNID("_CFOrderParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETFAMILY": {
                id: VNID("_ETFAMILY"),
                name: "Family",
                contentType: ContentType.Article,
                description: "A family is a level of taxonomic classification between Order and Genus.",
                friendlyIdPrefix: "f-",
                simplePropValues: {
                    "_CFFamilyTaxonomy": {id: VNID("_CFFamilyTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                    "_CFFamilyGenera": {id: VNID("_CFFamilyGenera"), label: "Genera", importance: 6, valueExpression: `this.related(via=RT[_GisF])`, note: ""},
                    "_CFFamilyParts": {id: VNID("_CFFamilyParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETGENUS": {
                id: VNID("_ETGENUS"),
                name: "Genus",
                contentType: ContentType.Article,
                description: "A genus is a level of taxonomic classification between Family and Species.",
                friendlyIdPrefix: "g-",
                simplePropValues: {
                    "_CFGenusTaxonomy": {id: VNID("_CFGenusTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                    "_CFGenusSpecies": {id: VNID("_CFGenusSpecies"), label: "Species", importance: 6, valueExpression: `this.related(via=RT[_SisG])`, note: ""},
                    "_CFGenusParts": {id: VNID("_CFGenusParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETSPECIES": {
                id: VNID("_ETSPECIES"),
                name: "Species",
                contentType: ContentType.Article,
                description: "A species is a basic unit of classifying life.",
                friendlyIdPrefix: "s-",
                simplePropValues: {
                    "_CFSpeciesTaxonomy": {id: VNID("_CFSpeciesTaxonomy"), label: "Taxonomy", importance: 5, valueExpression: "this.ancestors()", note: ""},
                    "_CFSpeciesParts": {id: VNID("_CFSpeciesParts"), label: "Parts", importance: 10, valueExpression: "this.andAncestors().related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETPLANTPART": {
                id: VNID("_ETPLANTPART"),
                name: "Plant Part",
                contentType: ContentType.Article,
                description: "Describes a part of a plant.",
                friendlyIdPrefix: "pp-",
                simplePropValues: {
                    "_CFPartTypeOf": {id: VNID("_CFPartTypeOf"), label: "Type of", importance: 1, valueExpression: `this.related(via=RT[_PARTisPART], direction="from")`, note: ""},
                    "_CFPartTypes": {id: VNID("_CFPartTypes"), label: "Types", importance: 2, valueExpression: `this.related(via=RT[_PARTisPART], direction="to")`, note: ""},
                    "_CFPartsFoundIn": {id: VNID("_CFPartsFoundIn"), label: "Part of", importance: 5, valueExpression: "this.related(via=RT[_HASA])", note: ""},
                },
            },
            "_ETPROPERTY": {
                id: VNID("_ETPROPERTY"),
                name: "Property",
                contentType: ContentType.Property,
                description: "Properties of a PlantDB entry.",
                friendlyIdPrefix: "p-",
                simplePropValues: {},
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
            // At any level, a classificaiton of plants can have a specific part, e.g. conifers have cones
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
            // Any other entry type can have a property
            "_HASPROP": {
                id: VNID("_HASPROP"),
                nameForward: "has property",
                nameReverse: "applies to",
                category: RelationshipCategory.HAS_PROPERTY,
                description: null,
                fromEntryTypes: [
                    // From every level of classification. These are in alphabetical order though to match how Neolace returns a site's schema.
                    VNID("_ETCLASS"),
                    VNID("_ETDIVISION"),
                    VNID("_ETFAMILY"),
                    VNID("_ETGENUS"),
                    VNID("_ETORDER"),
                    VNID("_ETPLANTPART"),
                    VNID("_ETSPECIES"),
                ],
                toEntryTypes: [VNID("_ETPROPERTY")],
            },
        },
    },
    entries: {
        // Our taxonomy tree:
        divisionTracheophyta: {id: VNID(), friendlyId: "d-tracheophyta", name: "Tracheophyta", description: "set below"},
            classPinopsida: {id: VNID(), friendlyId: "c-pinopsida", name: "Pinopsida", description: "set below"},
                orderPinales: {id: VNID(), friendlyId: "o-pinales", name: "Pinales", description: "set below"},
                    familyPinaceae: {id: VNID(), friendlyId: "f-pinaceae", name: "Pinaceae", description: "set below"},
                        genusPinus: {id: VNID(), friendlyId: "g-pinus", name: "Pinus", description: "set below"},
                            ponderosaPine: {id: VNID(), friendlyId: "s-pinus-ponderosa", name: "Ponderosa Pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/4J2F3
                            stonePine: {id: VNID(), friendlyId: "s-pinus-pinea", name: "Stone Pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/77KSK
                            jackPine: {id: VNID(), friendlyId: "s-pinus-banksiana", name: "Jack pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/4J237
                            japaneseRedPine: {id: VNID(), friendlyId: "s-pinus-densiflora", name: "Japanese red pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/4J25P
                            japaneseWhitePine: {id: VNID(), friendlyId: "s-pinus-parviflora", name: "Japanese white pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/77KTZ
                            jeffreyPine: {id: VNID(), friendlyId: "s-pinus-jeffreyi", name: "Jeffrey pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/77KTP
                            pinyonPine: {id: VNID(), friendlyId: "s-pinus-cembroides", name: "Pinyon pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/4J24K
                            westernWhitePine: {id: VNID(), friendlyId: "s-pinus-monticola", name: "Western white pine", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/4J2CG
                    familyCupressaceae: { id: VNID(), friendlyId: "f-cupressaceae", name: "Cupressaceae", description: "set below" },
                        genusCupressus: {id: VNID(), friendlyId: "g-cupressus", name: "Cupressus", description: "set below"},
                            mediterraneanCypress: {id: VNID(), friendlyId: "s-cupressus-sempervirens", name: "Mediterranean Cypress", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/32FXZ
                        genusThuja: {id: VNID(), friendlyId: "g-thuja", name: "Thuja", description: "set below"},
                            westernRedcedar: {id: VNID(), friendlyId: "s-thuja-plicata", name: "Western Redcedar", description: "set below"},  // https://www.catalogueoflife.org/data/taxon/56NTV
        // Plant parts:
        cone: {id: VNID(), friendlyId: "pp-cone", name: "Cone (strobilus)", description: "set below"},
            pollenCone: {id: VNID(), friendlyId: "pp-pollen-cone", name: "Pollen cone", description: "set below"},
            seedCone: {id: VNID(), friendlyId: "pp-seed-cone", name: "Seed cone", description: "set below"},
    },
};



export interface TestSetupData {
    emptySnapshot: VertexTestDataSnapshot,
    defaultDataSnapshot: VertexTestDataSnapshot,
    data: typeof data,
}
export const testDataFile = ".neolace-tests-data.json";

export async function generateTestFixtures(): Promise<TestSetupData> {

    // Wipe out all existing Neo4j data
    await graph.reverseAllMigrations();
    await graph.resetDBToSnapshot({cypherSnapshot: ""});
    await graph.runMigrations();

    log.info(`Creating "empty" snapshot...`);
    // We call this an "empty" snapshot but it actually includes any data created by migrations, like the system user
    const emptySnapshot = await graph.snapshotDataForTesting();

    log.info(`Generating default data for tests...`);

    const action = CreateUser({
        email: data.users.admin.email,
        fullName: data.users.admin.fullName,
        username: data.users.admin.username,
    });

    await graph.runAsSystem(action).then(result => data.users.admin.id = result.id);

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.admin.id,
        username: data.users.admin.bot.username,
        fullName: data.users.admin.bot.fullName,
        inheritPermissions: true,
    })).then(result => {
        data.users.admin.bot.id = result.id;
        data.users.admin.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateUser({
        email: data.users.regularUser.email,
        fullName: data.users.regularUser.fullName,
        username: data.users.regularUser.username,
    })).then(result => data.users.regularUser.id = result.id);

    await graph.runAsSystem(CreateSite({
        name: data.site.name,
        domain: data.site.domain,
        slugId: `site-${data.site.shortId}`,
        adminUser: data.users.admin.id,
        accessMode: data.site.initialAccessMode,
    })).then(result => {
        data.site.id = result.id;
        data.site.adminsGroupId = result.adminGroup;
    });

    await graph.runAsSystem(CreateGroup({
        name: "Users",
        belongsTo: data.site.id,
        addUsers: [data.users.regularUser.id],
        administerSite: false,
        administerGroups: false,
        approveEntryEdits: false,
        approveSchemaChanges: false,
        proposeEntryEdits: true,
        proposeSchemaChanges: true,
    })).then(result => data.site.usersGroupId = result.id);

    await graph.runAsSystem(ImportSchema({siteId: data.site.id, schema: data.schema}));

    // Create some initial entry data, specifically entries about plants.
    // All taxonomy data comes from https://www.catalogueoflife.org/
    await graph.runAsSystem(ApplyEdits({siteId: data.site.id, edits: [

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Create "Ponderosa Pine" and all its parent taxonomy entries:
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Create Division/Phylum "Tracheophyta" (vascular plants) - https://www.catalogueoflife.org/data/taxon/TP
        {code: "CreateEntry", data: {
            ...data.entries.divisionTracheophyta,
            type: data.schema.entryTypes._ETDIVISION.id,
            description: (data.entries.divisionTracheophyta.description =
                "Division/phylum ***Tracheophyta*** are the vascular plants."
            ),
        }},
            // Create Class "Pinopsida" (conifers) - https://www.catalogueoflife.org/data/taxon/GG
            {code: "CreateEntry", data: {
                ...data.entries.classPinopsida,
                type: data.schema.entryTypes._ETCLASS.id,
                description: (data.entries.classPinopsida.description =
                    "Class ***Pinopsida*** contains all extant conifers."
                ),
            }},
            // Class "Pinopsida" IS A member of division "Tracheophyta"
            {code: "CreateRelationshipFact", data: {
                id: VNID(),
                fromEntry: data.entries.classPinopsida.id,
                toEntry: data.entries.divisionTracheophyta.id,
                type: data.schema.relationshipTypes._CisD.id,
            }},
                // Create Order "Pinales" (conifers) - https://www.catalogueoflife.org/data/taxon/623FD
                {code: "CreateEntry", data: {
                    ...data.entries.orderPinales,
                    type: data.schema.entryTypes._ETORDER.id,
                    description: (data.entries.orderPinales.description = `
                        Order ***Pinales*** contains all extant conifers, such as the [pine family (Pinaceae)](/entry/${data.entries.familyPinaceae.id}) and yew family (Taxaceae).
                    `.trim()),
                }},
                // order "Pinales" IS A member of class "Pinopsida"
                {code: "CreateRelationshipFact", data: {
                    id: VNID(),
                    fromEntry: data.entries.orderPinales.id,
                    toEntry: data.entries.classPinopsida.id,
                    type: data.schema.relationshipTypes._OisC.id,
                }},
                    // Create Family "Pinaceae" (pine family) - https://www.catalogueoflife.org/data/taxon/625M7
                    {code: "CreateEntry", data: {
                        ...data.entries.familyPinaceae,
                        type: data.schema.entryTypes._ETFAMILY.id,
                        description: (data.entries.familyPinaceae.description = `
                            Family ***Pinaceae*** is the **pine family**. It includes cedars, firs, hemlocks, larches, spruces, and of course pines.
                        `.trim()),
                    }},
                    // family "Pinaceae" IS A member of order "Pinales"
                    {code: "CreateRelationshipFact", data: {
                        id: VNID(),
                        fromEntry: data.entries.familyPinaceae.id,
                        toEntry: data.entries.orderPinales.id,
                        type: data.schema.relationshipTypes._FisO.id,
                    }},
                        // Create Genus "Pinus" (pines) - https://www.catalogueoflife.org/data/taxon/6QPY
                        {code: "CreateEntry", data: {
                            ...data.entries.genusPinus,
                            type: data.schema.entryTypes._ETGENUS.id,
                            description: (data.entries.genusPinus.description = `
                                Genus ***Pinus***, commonly known as "pines".
                            `.trim()),
                        }},
                        // Genus "Pinus" IS A member of family "Pinaceae"
                        {code: "CreateRelationshipFact", data: {
                            id: VNID(),
                            fromEntry: data.entries.genusPinus.id,
                            toEntry: data.entries.familyPinaceae.id,
                            type: data.schema.relationshipTypes._GisF.id,
                        }},
                            // Ponderosa Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.ponderosaPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.ponderosaPine.description = `
                                    ***Pinus ponderosa*** (ponderosa pine) is a species of large pine tree in North America, whose bark resembles puzzle pieces.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.ponderosaPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Stone Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.stonePine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.stonePine.description = `
                                    ***Pinus pinea***, known as the **stone pine**, is a pine tree native to the Mediterranean, known and cutivated for their edible pine nuts.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.stonePine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Jack Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.jackPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.jackPine.description = `
                                    ***Pinus banksiana***, commonly called **jack pine**, is a pine tree native to eastern North America.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.jackPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Japanese Red Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.japaneseRedPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.japaneseRedPine.description = `
                                    ***Pinus densiflora***, also known as the **Japanese red pine**, the **Japanese pine**, or **Korean red pine**, is a species of pine tree native to Japan, the Korean Peninsula, northeastern China and the southeast of Russia.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.japaneseRedPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Japanese White Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.japaneseWhitePine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.japaneseWhitePine.description = `
                                    ***Pinus parviflora***, also known as **Japanese white pine**, **five-needle pine**, or **Ulleungdo white pine**, is a pine tree species native to Korea and Japan.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.japaneseWhitePine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Jeffrey Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.jeffreyPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.jeffreyPine.description = `
                                    ***Pinus jeffreyi***, commonly called the **Jeffrey pine**, is a pine tree found mainly in California as well as surrounding regions.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.jeffreyPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Pinyon Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.pinyonPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.pinyonPine.description = `
                                    ***Pinus cembroides***, also known as **pinyon pine**, **Mexican nut pine**, and **Mexican stone pine**, is a pine found in North America, primarily in Mexico. It lives in areas with little rainfall, and has edible pine nuts.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.pinyonPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                            // Western White Pine
                            {code: "CreateEntry", data: {
                                ...data.entries.westernWhitePine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.westernWhitePine.description = `
                                    ***Pinus monticola***, the **Western white pine** (also called **silver pine**, and **California mountain pine**), is a large pine found in Western Canada and the United States.
                                `.trim()),
                            }},
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.westernWhitePine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                    // Create Family "Cupressaceae" (cypress family)
                    {code: "CreateEntry", data: {
                        ...data.entries.familyCupressaceae,
                        type: data.schema.entryTypes._ETFAMILY.id,
                        description: (data.entries.familyCupressaceae.description = `
                            Family ***Cupressaceae*** is the **cypress family**. It includes the trees and shrubs with the common name "cypress", as well as several others such as the junipers and redwoods.
                        `.trim()),
                    }},
                    // family "Cupressaceae" IS A member of order "Pinales"
                    {code: "CreateRelationshipFact", data: {
                        id: VNID(),
                        fromEntry: data.entries.familyCupressaceae.id,
                        toEntry: data.entries.orderPinales.id,
                        type: data.schema.relationshipTypes._FisO.id,
                    }},
                        // Create Genus "Cupressus" (cypresses)
                        {code: "CreateEntry", data: {
                            ...data.entries.genusCupressus,
                            type: data.schema.entryTypes._ETGENUS.id,
                            description: (data.entries.genusCupressus.description = `
                                Genus ***Cupressus*** contains the conifer species that have the common name "cypress", such as the [mediterranean cypress](/entry/${data.entries.mediterraneanCypress.id}).
                            `.trim()),
                        }},
                        // Genus "Cupressus" IS A member of family "Cupressaceae"
                        {code: "CreateRelationshipFact", data: {
                            id: VNID(),
                            fromEntry: data.entries.genusCupressus.id,
                            toEntry: data.entries.familyCupressaceae.id,
                            type: data.schema.relationshipTypes._GisF.id,
                        }},
                            // Create Species "Cupressus sempervirens" - https://www.catalogueoflife.org/data/taxon/32FXZ
                            {code: "CreateEntry", data: {
                                ...data.entries.mediterraneanCypress,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.mediterraneanCypress.description = `
                                    ***Cupressus sempervirens***, the **Mediterranean cypress** is a cypress tree native to the Mediterranean Basin. It grows up to 35m tall and can be very long-lived, with some trees known to be more than 1,000 years old.
                                `.trim()),
                            }},
                            // Species "Cupressus sempervirens" IS A member of genus "Cupressus"
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.mediterraneanCypress.id,
                                toEntry: data.entries.genusCupressus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
                        // Create Genus "Thuja" (arborvitaes)
                        {code: "CreateEntry", data: {
                            ...data.entries.genusThuja,
                            type: data.schema.entryTypes._ETGENUS.id,
                            description: (data.entries.genusThuja.description = `
                                Genus ***Thuja*** has several species of coniferous trees that are part of the cypress family. Thujas are commonly known as Members are commonly known as **arborvitaes** or **cedars**, although they should not be confused with true cedars, a separate genus.
                            `.trim()),
                        }},
                        // Genus "Thuja" IS A member of family "Cupressaceae"
                        {code: "CreateRelationshipFact", data: {
                            id: VNID(),
                            fromEntry: data.entries.genusThuja.id,
                            toEntry: data.entries.familyCupressaceae.id,
                            type: data.schema.relationshipTypes._GisF.id,
                        }},
                            // Create Species "Thuja plicata" - https://www.catalogueoflife.org/data/taxon/56NTV
                            {code: "CreateEntry", data: {
                                ...data.entries.westernRedcedar,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: (data.entries.westernRedcedar.description = `
                                    ***Thuja plicata***, the **western redcedar**, is a large conifer that is among the most widespread trees in the Pacific Northwest.
                                `.trim()),
                            }},
                            // Species "Thuja plicata" IS A member of genus "Thuja"
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.westernRedcedar.id,
                                toEntry: data.entries.genusThuja.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
        
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Create entries about the cones (strobilus/strobili) that conifers have:
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Cone - https://en.wikipedia.org/wiki/Conifer_cone
        {code: "CreateEntry", data: {
            ...data.entries.cone,
            type: data.schema.entryTypes._ETPLANTPART.id,
            description: (data.entries.cone.description = `
                A **cone** (formally "strobilus") is a reproductive organ found on conifers.
            `.trim()),
        }},
            // Male cone (pollen cone)
            {code: "CreateEntry", data: {
                ...data.entries.pollenCone,
                type: data.schema.entryTypes._ETPLANTPART.id,
                description: (data.entries.pollenCone.description = `
                    A **pollen cone** or **male cone** (formally "microstrobilus") is a small reproductive organ bearing pollen found on conifers, not to be confused with the familiar [seed cone](/entry/${data.entries.seedCone.id}).
                `.trim()),
            }},
            {code: "CreateRelationshipFact", data: {
                id: VNID(),
                fromEntry: data.entries.pollenCone.id,
                toEntry: data.entries.cone.id,
                type: data.schema.relationshipTypes._PARTisPART.id,
            }},
            // Female cone (seed cone), what you think of as a "pine cone"
            {code: "CreateEntry", data: {
                ...data.entries.seedCone,
                type: data.schema.entryTypes._ETPLANTPART.id,
                description: (data.entries.seedCone.description = `
                    A **seed cone** or **female cone** (formally "megastrobilus") is a varied reproductive organ found on conifers. Examples include the well-known "pine cone".
                `.trim()),
            }},
            {code: "CreateRelationshipFact", data: {
                id: VNID(),
                fromEntry: data.entries.seedCone.id,
                toEntry: data.entries.cone.id,
                type: data.schema.relationshipTypes._PARTisPART.id,
            }},

        // All conifers (Class Pinopsida) have both male and female cones:
        {code: "CreateRelationshipFact", data: {
            id: VNID(),
            fromEntry: data.entries.classPinopsida.id,
            toEntry: data.entries.pollenCone.id,
            type: data.schema.relationshipTypes._HASA.id,
        }},
        {code: "CreateRelationshipFact", data: {
            id: VNID(),
            fromEntry: data.entries.classPinopsida.id,
            toEntry: data.entries.seedCone.id,
            type: data.schema.relationshipTypes._HASA.id,
        }},

    ]}));

    const defaultDataSnapshot = await graph.snapshotDataForTesting();

    return Object.freeze({emptySnapshot, defaultDataSnapshot, data});
}
