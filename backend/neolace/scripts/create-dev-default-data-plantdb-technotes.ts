/**
 * Create example data (TechNotes)
 */
import * as log from "std/log/mod.ts";
import { VNID, EmptyResultError, } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, ContentType, RelationshipCategory, CreateEntry, CreateRelationshipFact } from "neolace/deps/neolace-api.ts";

import { graph } from "neolace/core/graph.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { CreateUser, User } from "neolace/core/User.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { CreateSite, Site } from "neolace/core/Site.ts";
import { generateTestFixtures } from "neolace/lib/tests-default-data.ts";
import { CreateDraft, AcceptDraft } from "neolace/core/edit/Draft.ts";
 
// First reset the database, apply migrations, and create the same PlantDB content used for tests.
await generateTestFixtures();

// Now create the TechNotes example content too:

log.info("Checking users and site...");
// Create "Jamie" user for development, if it doesn't already exist
const {id: jamieId} = await graph.pullOne(User, u => u.id, {key: "user-jamie"}).catch(err => {
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAsSystem(CreateUser({
        email: "jamie@example.com",
        username: "jamie",
        fullName: "Jamie Developer",
    }));
});

// Create the "TechNotes" site:
const {id: siteId} = await graph.pullOne(Site, s => s.id, {key: "site-technotes"}).catch(err =>{
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAs(jamieId, CreateSite({
        name: "TechNotes",
        domain: "technotes.local.neolace.net",
        slugId: `site-technotes`,
        adminUser: jamieId,
    }));
});

log.info("Importing schema...");

// Schema IDs:
const techConceptId = VNID("_TECHCONCEPT");
const techConceptIsAId = VNID("_TCISA");

// Import the schema:
const schema: SiteSchemaData = {
    entryTypes: {
        [techConceptId]: {
            id: techConceptId,
            name: "TechConcept",
            contentType: ContentType.Article,
            description: "A TechConcept is a description of some technical thing.",
            friendlyIdPrefix: "tc-",
            simplePropValues: {
                "_CFTYPEOF": {
                    id: VNID("_CFTYPEOF"),
                    importance: 1,
                    label: "Type of",
                    valueExpression: `this.related(via=RT[${techConceptIsAId}], direction="from")`,
                    note: "",
                },
                "_CFTYPES": {
                    id: VNID("_CFTYPES"),
                    importance: 2,
                    label: "Types",
                    valueExpression: `this.related(via=RT[${techConceptIsAId}], direction="to")`,
                    note: "",
                },
            },
        }
    },
    relationshipTypes: {
        [techConceptIsAId]: {
            id: techConceptIsAId,
            nameForward: "is a",
            nameReverse: "has type",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [techConceptId],
            toEntryTypes: [techConceptId],
        },
        "_TCHASPART": {
            id: VNID("_TCHASPART"),
            nameForward: "has part",
            nameReverse: "used in",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [techConceptId],
            toEntryTypes: [techConceptId],
        },
    },
};
await graph.runAs(jamieId, ImportSchema({ siteId, schema }));

log.info("Resetting and creating content...");

const electricCarId = VNID();
const carId = VNID();

const {id: draftId} = await graph.runAs(jamieId, CreateDraft({
    authorId: jamieId,
    description: "Create some initial content for TechNotes",
    siteId,
    title: "Initial content",
    edits: [
        {
            // Entry for "electric car"
            code: CreateEntry.code,
            data: {
                name: "electric car",
                id: electricCarId,
                friendlyId: "tc-electric-car",
                description: "An electric car is a car powered by electric energy.",
                type: techConceptId,
            },
        },
        {
            // Entry for "car"
            code: CreateEntry.code,
            data: {
                name: "car",
                id: carId,
                friendlyId: "tc-car",
                description: "A car is a small motor vehicle used primarily to transport people.",
                type: techConceptId,
            },
        },
        {
            // An "electric car" IS A "car"
            code: CreateRelationshipFact.code,
            data: {
                id: VNID(),
                type: techConceptIsAId,
                fromEntry: electricCarId,
                toEntry: carId,
            },
        },
    ],
}));
await graph.runAs(jamieId, AcceptDraft({id: draftId}));


shutdown();