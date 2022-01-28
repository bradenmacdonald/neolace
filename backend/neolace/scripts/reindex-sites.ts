import { graph } from "neolace/core/graph.ts";
import { Site } from "neolace/core/Site.ts";
import { reindexAllEntries } from "neolace/plugins/search/update-index.ts";
import { shutdown } from "neolace/app/shutdown.ts";

const sites = await graph.pull(Site, (s) => s.id.name);
for (const site of sites) {
    console.log(`Updating site ${site.name} (${site.id})`);
    await reindexAllEntries(site.id);
}

shutdown();
