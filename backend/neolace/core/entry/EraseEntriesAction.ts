import { C, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";

export const EraseEntries = defineAction({
    type: "EraseEntries",
    parameters: {} as {
        siteId: VNID;
    },
    resultData: {},
    apply: async (tx, data) => {
        // This is a very dangerous action that will erase all content on the given site. It's mostly useful for
        // development.
        const propertyFacts = await tx.query(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)-[:FOR_SITE]->(site)
            WITH pf, pf.id AS id
            DETACH DELETE pf
        `.RETURN({ "id": Field.VNID }));

        const entryFeatures = await tx.query(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (e:${Entry})-[:${Entry.rel.IS_OF_TYPE}]-(et)-[:FOR_SITE]->(site)
            MATCH (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(ef)
            WITH ef, ef.id AS id
            DETACH DELETE ef
        `.RETURN({ "id": Field.VNID }));

        const entries = await tx.query(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (e:${Entry})-[:${Entry.rel.IS_OF_TYPE}]-(et)-[:FOR_SITE]->(site)
            OPTIONAL MATCH (slug:SlugId)-[:IDENTIFIES]->(e)
            WITH e, slug, e.id AS id
            DETACH DELETE slug
            DETACH DELETE e
        `.RETURN({ "id": Field.VNID }));

        return {
            resultData: {},
            modifiedNodes: [
                ...propertyFacts.map((x) => x.id),
                ...entryFeatures.map((x) => x.id),
                ...entries.map((x) => x.id),
            ],
            description: `Erased all entries on ${Site.withId(data.siteId)}`,
        };
    },
});
