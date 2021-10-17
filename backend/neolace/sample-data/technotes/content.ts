import { VNID, } from "neolace/deps/vertex-framework.ts";
import { AnyContentEdit, UpdateEntryFeature, schemas } from "neolace/deps/neolace-api.ts";
import { schemaIds } from "./schema.ts";

// From backend, run "deno", then
//  import { VNID } from "./neolace/deps/vertex-framework.ts";
// then
//  new Array(10).fill(undefined).map(_ => VNID())
export const ids = {
    car: VNID("_4sd6mGkfpCfrvi3em2IFA0"),
    electricCar: VNID("_1gJxmBoyHajaFBqxzu6KZi"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    propWordNetSynsetId: VNID("_524rvY8aJKbRMbGz5n7HfC"),
    spare004: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    spare005: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    spare006: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
    spare007: VNID("_5lqx2yOMSlbibeIT5psLCr"),
    spare008: VNID("_5hqETvE3WTHuYvhHbwWuD"),
    spare009: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    spare010: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
};

export const edits: AnyContentEdit[] = [
    // Property: External Identifier
    ...createEntry({
        id: ids.propExternalId,
        name: "External Identifier",
        friendlyId: "p-ext-id",
        type: schemaIds.property,
        description: "Identifier for an entry in an external system, outside of TechNotes.",
        features: [
            {featureType: "UseAsProperty", importance: 30},
        ],
    }),
    // Property: Wikidata ID
    ...createEntry({
        id: ids.propWikidataId,
        name: "Wikidata Entry ID",
        friendlyId: "p-wikidata-id",
        type: schemaIds.property,
        description: "ID of this item on Wikidata, the free knowledge base that anyone can edit.",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
    }),
    // Property: WordNet 3.1 Synset ID
    ...createEntry({
        id: ids.propWordNetSynsetId,
        name: "WordNet 3.1 Synset ID",
        friendlyId: "p-wordnet31-synset-id",
        type: schemaIds.property,
        description: "Identifier for this entry in Princeton's WordNet, the lexical database for English.",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/pwn30/{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
    }),
    // Car
    ...createEntry({
        id: ids.car,
        name: "Car",
        friendlyId: "tc-car",
        type: schemaIds.techConcept,
        description: "A car is a motor vehicle with four wheels, used primarily to transport people.",
        props: {
            [ids.propWikidataId]: { valueExpr: `"Q1420"` },
            [ids.propWordNetSynsetId]: { valueExpr: `"02958343-n"` },
        },
    })
];

function createEntry({id, ...args}: {
    id: VNID,
    name: string,
    type: VNID,
    friendlyId: string,
    description?: string,
    features?: schemas.Type<typeof UpdateEntryFeature["dataSchema"]>["feature"][],
    rels?: [{type: VNID, to: VNID, noteMD?: string}],
    props?: Record<VNID, {valueExpr: string, note?: string}>,
}): AnyContentEdit[] {
    const edits: AnyContentEdit[] = [
        {code: "CreateEntry", data: {
            id: id,
            name: args.name,
            type: args.type,
            friendlyId: args.friendlyId,
            description: args.description ?? "",
        }},
    ];
    args.features?.forEach(feature => {
        edits.push({code: "UpdateEntryFeature", data: {
            entryId: id,
            feature,
        }});
    });
    args.rels?.forEach(rel => {
        edits.push({code: "CreateRelationshipFact", data: {
            id: VNID(),
            fromEntry: id,
            toEntry: rel.to,
            type: rel.type,
            noteMD: rel.noteMD,
        }});
    });
    Object.entries(args.props ?? {}).forEach(([propId, prop]) => {
        edits.push({code: "UpdatePropertyValue", data: {
            entry: id,
            property: VNID(propId),
            valueExpression: prop.valueExpr,
            note: prop.note ?? "",
        }});
    });


    return edits;
}
