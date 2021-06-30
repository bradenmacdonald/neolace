/**
 * Create example data (TechNotes)
 */
import * as log from "std/log/mod.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { SiteSchemaData, ContentType, RelationshipCategory } from "neolace/deps/neolace-api.ts";

import { graph } from "neolace/core/graph.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { CreateUser } from "neolace/core/User.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { CreateSite } from "neolace/core/Site.ts";
 

log.debug("Checking migrations...");
await graph.runMigrations();

// Create "Jamie" user for development
const {id: jamieId} = await graph.runAsSystem(
    CreateUser({
        email: "jamie@example.com",
        username: "jamie",
        fullName: "Jamie Developer",
    })
);

// Create the "TechNotes" site:
const {id: siteId} = await graph.runAs(jamieId,
    CreateSite({
        domain: "localhost:5555",
        slugId: `site-technotes`,
        adminUser: jamieId,
    })
);
// Import the schema:
const schema: SiteSchemaData = {
    entryTypes: {
        _TECHCONCEPT: {
            id: VNID("_TECHCONCEPT"),
            name: "TechConcept",
            contentType: ContentType.Article,
            description: "A TechConcept is a description of some technical thing.",
            friendlyIdPrefix: "tc-",
        }
    },
    relationshipTypes: {
        "_TCISA": {
            id: VNID("_TCISA"),
            nameForward: "is a",
            nameReverse: "has type",
            category: RelationshipCategory.IS_A,
            description: null,
            fromEntryTypes: [VNID("_TECHCONCEPT")],
            toEntryTypes: [VNID("_TECHCONCEPT")],
        },
        "_TCHASPART": {
            id: VNID("_TCHASPART"),
            nameForward: "has part",
            nameReverse: "used in",
            category: RelationshipCategory.HAS_A,
            description: null,
            fromEntryTypes: [VNID("_TECHCONCEPT")],
            toEntryTypes: [VNID("_TECHCONCEPT")],
        },
    },
};
await graph.runAs(jamieId, ImportSchema({ siteId, schema }));
shutdown();
