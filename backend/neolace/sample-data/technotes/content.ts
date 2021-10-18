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
    motorVehicle: VNID("_5lqx2yOMSlbibeIT5psLCr"),
    propAlsoKnownAs: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    propWikidataPropertyId: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    propWordNetILI: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
    propWordNet31SynsetId: VNID("_524rvY8aJKbRMbGz5n7HfC"),
    spare008: VNID("_5hqETvE3WTHuYvhHbwWuD"),
    spare009: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    spare010: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
};

export const edits: AnyContentEdit[] = [
    // Property: Also known as
    ...createEntry({
        id: ids.propAlsoKnownAs,
        name: "Also known as",
        friendlyId: "p-aka",
        type: schemaIds.property,
        description: "Other names for this entry",
        features: [
            {featureType: "UseAsProperty", importance: 1},
        ],
    }),
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
        name: "Wikidata QID",
        friendlyId: "p-wikidata-id",
        type: schemaIds.property,
        description: "ID of this entry on Wikidata, the free knowledge base that anyone can edit.",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](https://www.wikidata.org/wiki/{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["Wikidata item ID", "WDQID"]) },
            [ids.propWikidataId]: { valueExpr: `"Q43649390"` },
        },
    }),
    // Property: Wikidata Property ID
    ...createEntry({
        id: ids.propWikidataPropertyId,
        name: "Wikidata Property ID",
        friendlyId: "p-wikidata-pid",
        type: schemaIds.property,
        description: "ID of this property entry on Wikidata, the free knowledge base that anyone can edit.",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](https://www.wikidata.org/wiki/Property:{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
    }),
    // Property: WordNet Interlingual Index
    ...createEntry({
        id: ids.propWordNetILI,
        name: "Interlingual Index",
        friendlyId: "p-ili",
        type: schemaIds.property,
        description: "Language-neutral identifier to look up this concept in a WordNet, like Princeton WordNet (for English)",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/ili/{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
        props: {
            [ids.propWikidataPropertyId]: { valueExpr: `"P8814"` },
        },
    }),
    // Property: WordNet 3.1 Synset ID
    ...createEntry({
        id: ids.propWordNet31SynsetId,
        name: "WordNet 3.1 Synset ID",
        friendlyId: "p-wordnet31-synset-id",
        type: schemaIds.property,
        description: "Identifier for this entry in Princeton's WordNet, the lexical database for English.",
        features: [
            {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/id/{value})",},
        ],
        rels: [
            {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
        ],
        props: {
            [ids.propWikidataPropertyId]: { valueExpr: `"P8814"` },
        },
    }),
    // Motor Vehicle
    ...createEntry({
        id: ids.motorVehicle,
        name: "Motor Vehicle",
        friendlyId: "tc-motor-vehicle",
        type: schemaIds.techConcept,
        description: "A motor vehicle is a wheeled vehicle that can propel itself and which does not run on rails.",
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["automotive vehicle", "self-propelled vehicle"]) },
            [ids.propWikidataId]: { valueExpr: `"Q1420"` },
            [ids.propWordNet31SynsetId]: { valueExpr: `"03796768-n"` },
            [ids.propWordNetILI]: { valueExpr: `"i56401"` },
        },
    }),
    // Car
    ...createEntry({
        id: ids.car,
        name: "Car",
        friendlyId: "tc-car",
        type: schemaIds.techConcept,
        description: "A car is a motor vehicle with four wheels, used primarily to transport people.",
        rels: [
            {type: schemaIds.techConceptIsA, to: ids.motorVehicle},
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["motorcar", "automobile", "auto", "car"]) },
            [ids.propWikidataId]: { valueExpr: `"Q1420"` },
            [ids.propWordNet31SynsetId]: { valueExpr: `"02961779-n"` },
            [ids.propWordNetILI]: { valueExpr: `"i51496"` },
        },
    }),
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
