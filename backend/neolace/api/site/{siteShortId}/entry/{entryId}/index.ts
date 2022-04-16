import { api, getGraph, NeolaceHttpResource, permissions } from "neolace/api/mod.ts";
import { getEntry } from "neolace/api/site/{siteShortId}/entry/{entryId}/_helpers.ts";

export class EntryResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/entry/:entryKey"];

    GET = this.method({
        responseSchema: api.EntrySchema,
        description: "Get an entry",
    }, async ({ request }) => {
        const graph = await getGraph();
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewEntries);
        const { siteId } = await this.getSiteDetails(request);
        const entryKey = request.pathParam("entryKey");
        if (entryKey === undefined) {
            throw new api.InvalidFieldValue([{ fieldPath: "entryKey", message: "entryKey is required." }]);
        }
        const flags = this.getRequestFlags(request, api.GetEntryFlags);

        // Response:
        return await graph.read((tx) => getEntry(entryKey, siteId, tx, flags));
    });
}
