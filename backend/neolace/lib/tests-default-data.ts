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
                computedFacts: {},
            },
            "_ETCLASS": {
                id: VNID("_ETCLASS"),
                name: "Class",
                contentType: ContentType.Article,
                description: "A class is a level of taxonomic classification between Division/Phylum and Order.",
                friendlyIdPrefix: "c-",
                computedFacts: {},
            },
            "_ETORDER": {
                id: VNID("_ETORDER"),
                name: "Order",
                contentType: ContentType.Article,
                description: "An order is a level of taxonomic classification between Class and Family.",
                friendlyIdPrefix: "o-",
                computedFacts: {},
            },
            "_ETFAMILY": {
                id: VNID("_ETFAMILY"),
                name: "Family",
                contentType: ContentType.Article,
                description: "A family is a level of taxonomic classification between Order and Genus.",
                friendlyIdPrefix: "f-",
                computedFacts: {},
            },
            "_ETGENUS": {
                id: VNID("_ETGENUS"),
                name: "Genus",
                contentType: ContentType.Article,
                description: "A genus is a level of taxonomic classification between Family and Species.",
                friendlyIdPrefix: "g-",
                computedFacts: {},
            },
            "_ETSPECIES": {
                id: VNID("_ETSPECIES"),
                name: "Species",
                contentType: ContentType.Article,
                description: "A species is a basic unit of classifying life.",
                friendlyIdPrefix: "s-",
                computedFacts: {
                    "_CFSpeciesTaxonomy": {id: VNID("_CFSpeciesTaxonomy"), label: "Taxonomy", importance: 5, expression: "this.ancestors()"},
                },
            },
            "_ETPLANTPART": {
                id: VNID("_ETPLANTPART"),
                name: "Plant Part",
                contentType: ContentType.Article,
                description: "Describes a part of a plant.",
                friendlyIdPrefix: "pp-",
                computedFacts: {},
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
        },
    },
    entries: {
        // Species:
        ponderosaPine: {id: VNID(), friendlyId: "s-pinus-ponderosa", name: "Ponderosa Pine"},
        // Other taxonomy levels:
        divisionTracheophyta: {id: VNID(), friendlyId: "d-tracheophyta", name: "Tracheophyta"},
            classPinopsida: {id: VNID(), friendlyId: "c-pinopsida", name: "Pinopsida"},
                orderPinales: {id: VNID(), friendlyId: "o-pinales", name: "Pinales"},
                    familyPinaceae: {id: VNID(), friendlyId: "f-pinaceae", name: "Pinaceae"},
                        genusPinus: {id: VNID(), friendlyId: "g-pinus", name: "Pinus"},
        // Plant parts:
        cone: {id: VNID(), friendlyId: "pp-cone", name: "Cone (strobilus)"},
            pollenCone: {id: VNID(), friendlyId: "pp-pollen-cone", name: "Pollen cone"},
            seedCone: {id: VNID(), friendlyId: "pp-seed-cone", name: "Seed cone"},
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
            description: "Division/phylum Tracheophyta are the vascular plants.",
        }},
            // Create Class "Pinopsida" (conifers) - https://www.catalogueoflife.org/data/taxon/GG
            {code: "CreateEntry", data: {
                ...data.entries.classPinopsida,
                type: data.schema.entryTypes._ETCLASS.id,
                description: "Class Pinopsida contains all extant conifers.",
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
                    description: "Order Pinales contains all extant conifers, such as the pine family (Pinaceae) and yew family (Taxaceae).",
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
                        description: "Family Pinaceae is the pine family. It includes cedars, firs, hemlocks, larches, spruces, and of course pines.",
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
                            description: "Genus Pinus, commonly known as \"pines\".",
                        }},
                        // Genus "Pinus" IS A member of family "Pinaceae"
                        {code: "CreateRelationshipFact", data: {
                            id: VNID(),
                            fromEntry: data.entries.genusPinus.id,
                            toEntry: data.entries.familyPinaceae.id,
                            type: data.schema.relationshipTypes._GisF.id,
                        }},
                            // Create Species "Pinus Ponderosa" - https://www.catalogueoflife.org/data/taxon/4J2F3
                            {code: "CreateEntry", data: {
                                ...data.entries.ponderosaPine,
                                type: data.schema.entryTypes._ETSPECIES.id,
                                description: "**Pinus ponderosa** (ponderosa pine) is a species of large pine tree in North America, whose bark resembles puzzle pieces.",
                            }},
                            // Species "pinus ponderosa" IS A member of genus "Pinus"
                            {code: "CreateRelationshipFact", data: {
                                id: VNID(),
                                fromEntry: data.entries.ponderosaPine.id,
                                toEntry: data.entries.genusPinus.id,
                                type: data.schema.relationshipTypes._SisG.id,
                            }},
        
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Create entries about the cones (strobilus/strobili) that conifers have:
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        // Cone - https://en.wikipedia.org/wiki/Conifer_cone
        {code: "CreateEntry", data: {
            ...data.entries.cone,
            type: data.schema.entryTypes._ETPLANTPART.id,
            description: "A cone (formally \"strobilus\") is a reproductive organ found on conifers.",
        }},
            // Male cone (pollen cone)
            {code: "CreateEntry", data: {
                ...data.entries.pollenCone,
                type: data.schema.entryTypes._ETPLANTPART.id,
                description: "A pollen cone or male cone (formally \"microstrobilus\") is a small reproductive organ bearing pollen found on conifers, not to be confused with the familiar seed cone.",
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
                description: "A seed cone or female cone (formally \"megastrobilus\") is a varied reproductive organ found on conifers. Examples include the well-known \"pine cone\".",
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
