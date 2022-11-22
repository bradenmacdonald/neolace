#!/usr/bin/env deno run --allow-net --allow-read --allow-env
// TODO: once we have a REST API to create/update sites, change this to use the REST API only.

import * as log from "std/log/mod.ts";
import { EmptyResultError, VNID } from "neolace/deps/vertex-framework.ts";
 
import { shutdown } from "neolace/app/shutdown.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite, Site, UpdateSite } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { siteData } from "./site.ts";

const graph = await getGraph();

log.info("Creating site...");
 
// Get the admin user
const {id: adminUserId} = await graph.pullOne(User, u => u.id, {with: {username: "admin"}}).catch(() => {
    throw new Error("Admin user is missing - run 'Erase database and create default sites' to fix.");
});

// Create the docs site:
const {id: siteId} = await graph.pullOne(Site, s => s.id, {with: {friendlyId: "docs"}}).catch(err =>{
    if (!(err instanceof EmptyResultError)) { throw err; }
    return graph.runAsSystem(CreateSite({
        id: VNID("_5KJ0sVd9pQrsLi4fYlBrR6"),
        name: "Neolace documentation",
        domain: "docs.local.neolace.net",
        friendlyId: `docs`,
        adminUser: adminUserId,
    }));
});

await graph.runAsSystem(UpdateSite({id: siteId, ...siteData}));
await shutdown();
