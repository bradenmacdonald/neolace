/**
 * Create example/update sample data for the TechNotes demo site, which is accessible at
 * http://technotes.local.neolace.net:5555/
 */
import * as log from "std/log/mod.ts";
import { C, Field, EmptyResultError, GenericCypherAction, VNID } from "neolace/deps/vertex-framework.ts";

import { dedent } from "neolace/lib/dedent.ts";
import { graph } from "neolace/core/graph.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { CreateUser, User } from "neolace/core/User.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { CreateSite, Site, UpdateSite } from "neolace/core/Site.ts";
import { CreateDraft, AcceptDraft } from "neolace/core/edit/Draft.ts";
import { schema } from "neolace/sample-data/technotes/schema.ts";
import { edits } from "neolace/sample-data/technotes/content.ts";
import { ensureFilesExist } from "neolace/sample-data/technotes/datafiles.ts";



log.info("Reversing all migrations");
await graph.reverseAllMigrations();
log.info("Resetting DB to empty snapshot");
await graph.resetDBToSnapshot({cypherSnapshot: ""});
log.info("Applying migrations");
await graph.runMigrations();

// Now create the TechNotes example content too:

log.info("Checking users and site...");

// Create "Braden" for initial content, if it doesn't already exist
const {id: bradenId} = await graph.pullOne(User, u => u.id, {key: "user-braden"}).catch(err => {
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAsSystem(CreateUser({
        email: "braden@technotes.org",
        username: "braden",
        fullName: "Braden MacDonald",
        fakeAuthn: true,
    }));
});

// Create the "TechNotes" site:
const {id: siteId} = await graph.pullOne(Site, s => s.id, {key: "site-technotes"}).catch(err =>{
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAs(bradenId, CreateSite({
        id: VNID("_siteTECHNOTES"),
        name: "TechNotes",
        domain: "proto.technotes.org",
        slugId: `site-technotes`,
        siteCode: "TECHN",
        adminUser: bradenId,
    }));
});

await graph.runAsSystem(UpdateSite({
    key: siteId,
    homePageMD: dedent`
        # Welcome to TechNotes

        TechNotes is an open engineering library focused on clean tech - specifically electric vehicle (EV) battery
        technology. Our goal is to combine combine data, reference articles, design examples, datasets, patents,
        technical drawings, and discussion forums together in one integrated resource that's exceptionally easy to use
        and well-organized.

        ## About This Prototype

        This is our new prototype, built using Neolace, our new platform for building a collaborative knowledge base.

        We will be posting some detailed example content soon!

        You can see some of the features of our platform on the entry for ["car"](/entry/tc-car).





        ## Legal

        License: Text content (articles and descriptions) is available under the terms of the [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/). Properties and their values are public domain. Images and other media files are available under various licenses - refer to each item's page for details.

        Terms of use: The content on this site is provided with no warranty, express or implied. Do not rely on this content for any important purpose without verifying it independently.
    `,
}));

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
