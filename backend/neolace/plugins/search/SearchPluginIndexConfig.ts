import { C, defineAction, Field, VNID, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/plugins/api.ts";

/**
 * For each site, one of these nodes stores data about the site's search index.
 */
export class SearchPluginIndexConfig extends VNodeType {
    static label = "SearchPluginIndexConfig";
    static properties = {
        ...VNodeType.properties,
        searchApiKey: Field.String,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });
}

export const UpdateSiteApiKey = defineAction({
    type: "Update",
    parameters: {} as {
        siteId: VNID;
        apiKey: string;
    },
    apply: async (tx, data) => {
        const result = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MERGE (site)<-[:${SearchPluginIndexConfig.rel.FOR_SITE}]-(config:${SearchPluginIndexConfig})
            ON MATCH
                SET config.searchApiKey = ${data.apiKey}
            ON CREATE
                SET config.id = ${VNID()}
                SET config.searchApiKey = ${data.apiKey}
        `.RETURN({ "config.id": Field.VNID, "config.searchApiKey": Field.String }));

        return {
            description: ``,
            modifiedNodes: [result["config.id"]],
            resultData: {},
        };
    },
});
