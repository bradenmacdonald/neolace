/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { getEntry } from "neolace/rest-api/site/[siteKey]/entry/[entryId]/_helpers.ts";

export class EntryResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/entry/:entryKey"];

    GET = this.method({
        responseSchema: SDK.EntrySchema,
        description: "Get an entry",
    }, async ({ request }) => {
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);
        const entryKey = request.pathParam("entryKey");
        if (entryKey === undefined) {
            throw new SDK.InvalidFieldValue([{ fieldPath: "entryKey", message: "entryKey is required." }]);
        }
        const flags = this.getRequestFlags(request, SDK.GetEntryFlags);

        // Note: permission checking is done within this helper method:
        return await graph.read((tx) => getEntry(entryKey, siteId, request.user?.id, tx, flags));
    });
}
