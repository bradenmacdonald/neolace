/**
 * Create example/update sample data for the TechNotes demo site, which is accessible at
 * http://technotes.local.neolace.net:5555/
 */
import * as log from "std/log/mod.ts";
import { C, Field, EmptyResultError, GenericCypherAction, VNID } from "neolace/deps/vertex-framework.ts";

import { graph } from "neolace/core/graph.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { CreateUser, User } from "neolace/core/User.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { CreateSite, Site, UpdateSite } from "neolace/core/Site.ts";
import { CreateDraft, AcceptDraft } from "neolace/core/edit/Draft.ts";
import { schema } from "neolace/sample-data/technotes/schema.ts";
import { edits } from "neolace/sample-data/technotes/content.ts";
import { siteData } from "neolace/sample-data/technotes/site.ts";
import { ensureFilesExist } from "neolace/sample-data/technotes/datafiles.ts";
import { generateTestFixtures } from "neolace/lib/tests-default-data.ts";
  


/////////// TEMP /////////////
/////////// TEMP /////////////
/////////// TEMP /////////////
/////////// TEMP /////////////
log.info("Resetting to PlantDB only.");
await generateTestFixtures();
log.info("Done PlantDB reset");
/////////// TEMP /////////////
/////////// TEMP /////////////
/////////// TEMP /////////////
/////////// TEMP /////////////




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
// Create "Braden" for initial content, if it doesn't already exist
const {id: bradenId} = await graph.pullOne(User, u => u.id, {key: "user-braden"}).catch(err => {
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAsSystem(CreateUser({
        email: "braden@technotes.org",
        username: "braden",
        fullName: "Braden MacDonald",
    }));
});

// Create the "TechNotes" site:
const {id: siteId} = await graph.pullOne(Site, s => s.id, {key: "site-technotes"}).catch(err =>{
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAs(jamieId, CreateSite({
        id: VNID("_siteTECHNOTES"),
        name: "TechNotes",
        domain: "technotes.local.neolace.net",
        slugId: `site-technotes`,
        siteCode: "TECHN",
        adminUser: jamieId,
    }));
});

await graph.runAsSystem(UpdateSite({key: siteId, ...siteData}));
 
log.info("Importing schema...");
 
await graph.runAs(bradenId, ImportSchema({ siteId, schema }));
 
log.info("Uploading data files...");

await ensureFilesExist();

log.info("Updating content...");
 
const lastEdit: number = (await graph.read(tx => tx.queryOne(C`
    MATCH (site:${Site}), site HAS KEY ${siteId}
`.RETURN({"site._devDataLastEditCount": Field.NullOr.Int}))))["site._devDataLastEditCount"] ?? 0;

// This is a giant hack for now.
// We have a list of edits. Using a hacky way, track which edits have already been applied, and then apply any newer
// edits as a new draft.
if (lastEdit < edits.length) {
    const newEdits = edits.slice(lastEdit);
    const {id: draftId} = await graph.runAs(bradenId, CreateDraft({
        authorId: bradenId,
        siteId,
        description: `Applying ${newEdits.length} updates from the TechNotes sample data.`,
        title: "Update TechNotes Content",
        edits: newEdits,
    }));
    await graph.runAs(bradenId, AcceptDraft({id: draftId}));

    await graph.runAsSystem(GenericCypherAction({
        cypher: C`
            MATCH (site:${Site}), site HAS KEY ${siteId}
            SET site._devDataLastEditCount = ${edits.length}
        `,
        modifiedNodes: [siteId],
    }));
}
 
shutdown();
