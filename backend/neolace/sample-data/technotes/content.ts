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
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    spare003: VNID("_524rvY8aJKbRMbGz5n7HfC"),
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
    }),
    // Car
    ...createEntry({
        id: ids.car,
        name: "Car",
        friendlyId: "tc-car",
        type: schemaIds.techConcept,
        description: "A car is a motor vehicle with four wheels, used primarily to transport people.",
    })
];

function createEntry({id, ...args}: {
    id: VNID,
    name: string,
    type: VNID,
    friendlyId: string,
    description?: string,
    features?: schemas.Type<typeof UpdateEntryFeature["dataSchema"]>["feature"][],
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
    if (args.features) {
        for (const feature of args.features) {
            edits.push({code: "UpdateEntryFeature", data: {
                entryId: id,
                feature,
            }});
        }
    }


    return edits;
}
