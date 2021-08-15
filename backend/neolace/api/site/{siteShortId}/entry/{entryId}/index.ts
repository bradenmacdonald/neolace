import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { getEntry } from "neolace/api/site/{siteShortId}/entry/{entryId}/_helpers.ts";



export class EntryResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/entry/:entryKey"];

    GET = this.method({
        responseSchema: api.EntrySchema,
        description: "Get an entry",
    }, async () => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanViewEntries);
        const {siteId} = await this.getSiteDetails();
        const entryKey = this.request.getPathParam("entryKey");
        if (entryKey === null) {
            throw new api.InvalidFieldValue([{fieldPath: "entryKey", message: "entryKey is required."}]);
        }
        const flags = this.getRequestFlags(api.GetEntryFlags);

        // Response:
        return await graph.read(tx => getEntry(entryKey, siteId, tx, flags));
    });
}
