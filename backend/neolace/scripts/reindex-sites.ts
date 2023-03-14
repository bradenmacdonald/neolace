/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph } from "neolace/core/graph.ts";
import { Site } from "neolace/core/Site.ts";
import { reindexAllEntries } from "neolace/plugins/search/update-index.ts";
import { shutdown } from "neolace/app/shutdown.ts";

const sites = await (await getGraph()).pull(Site, (s) => s.id.name);
for (const site of sites) {
    console.log(`Updating site ${site.name} (${site.id})`);
    await reindexAllEntries(site.id);
}

shutdown();
