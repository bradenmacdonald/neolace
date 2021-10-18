import { VNID, } from "neolace/deps/vertex-framework.ts";
import { AnyContentEdit, UpdateEntryFeature, schemas } from "neolace/deps/neolace-api.ts";
import { schemaIds } from "./schema.ts";
import { files } from "./datafiles.ts";

// From backend, run "deno", then
//  import { VNID } from "./neolace/deps/vertex-framework.ts";
// then
//  new Array(10).fill(undefined).map(_ => VNID())
export const ids = {
    car: VNID("_4sd6mGkfpCfrvi3em2IFA0"),
    electricCar: VNID("_1gJxmBoyHajaFBqxzu6KZi"),
    motorVehicle: VNID("_5lqx2yOMSlbibeIT5psLCr"),
    imgMiniCooperSe: VNID("_5hqETvE3WTHuYvhHbwWuD"),
    propAlsoKnownAs: VNID("_3wFkZlVNILDjexTL2AiZSB"),
    propContentSource: VNID(),
    propCreator: VNID("_3zmtupLIgSw4GUtFFah5nb"),
    propExternalId: VNID("_6O1e4ErQw84vaTOb335V3y"),
    propLicense: VNID("_1f65YAjUSb4RLKbJ0MqEd8"),
    propWikidataId: VNID("_FVzZG1cmLEcVJlN0py9Oa"),
    propWikidataPropertyId: VNID("_22jn4GZRCtjNIJQC0eDQDM"),
    propWordNetILI: VNID("_aC2AVdeAK0iQyjbIbXp0r"),
    // propWordNet31SynsetId: VNID("_524rvY8aJKbRMbGz5n7HfC"),  // Not used in favor of ILI
    //spare: VNID("_5HYZND6114KVUtCGjFC8mT"),
    //spare: VNID("_3VVHFqLRvQtI1YzMP7OxVV"),
    //spare: VNID("_2azW7zIxVCeNrbXuRrsm2k"),
    //spare: VNID("_2uDtUtOWJCL33X7zTAK8dK"),
    //spare: VNID("_2QK8KQVZfHogH5ofrksCba"),
    //spare: VNID("_7OCTF7b5Z4wM7KvEE16OtK"),
    //spare: VNID("_4HwJfgRjCzfOI7z2XTzY0r"),
    //spare: VNID("_5GDsp3jxMTJ1liBePo9sgT"),
    //spare: VNID("_75HaEKOi2Ir5UV84KH3CGk"),
    //spare: VNID("_7RHY0mKlOEp2xsahAaNcbc"),
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
        // See https://stackoverflow.com/a/33348009/1057326 for details on these various WordNet identifiers
        features: [
            // See https://github.com/jmccrae/wordnet-angular/blob/c3c41778e333b958ff8240288d23bb5e0cba1c1d/src/main.rs#L637-L654
            // for the Princeton WordNet Angular URL formats
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
    // For now we're not using this, in favor of the Interlingual Index
    // ...createEntry({
    //     id: ids.propWordNet31SynsetId,
    //     name: "WordNet 3.1 Synset ID",
    //     friendlyId: "p-wordnet31-synset-id",
    //     type: schemaIds.property,
    //     description: "Identifier for this entry in Princeton's WordNet, the lexical database for English.",
    //     features: [
    //         {featureType: "UseAsProperty", importance: 15, displayAs: "[{value}](http://wordnet-rdf.princeton.edu/id/{value})",},
    //     ],
    //     rels: [
    //         {type: schemaIds.propIsAProp, to: ids.propExternalId},  // This is a type of external identifier
    //     ],
    //     props: {
    //         [ids.propWikidataPropertyId]: { valueExpr: `"P8814"` },
    //     },
    // }),
    // Property: Creator
    ...createEntry({
        id: ids.propCreator,
        name: "Creator",
        friendlyId: "p-creator",
        type: schemaIds.property,
        description: "The creator of this work, e.g. the designer or inventor or photographer or author.",
        features: [
            {featureType: "UseAsProperty", importance: 4},
        ],
        props: {
            [ids.propWikidataPropertyId]: {valueExpr: `"P170"`},
        },
    }),
    // Property: License
    ...createEntry({
        id: ids.propLicense,
        name: "License",
        friendlyId: "p-lic",
        type: schemaIds.property,
        description: "The copyright license(s) under which this work can be used",
        features: [
            {featureType: "UseAsProperty", importance: 15},
        ],
        props: {
            [ids.propAlsoKnownAs]: { valueExpr: JSON.stringify(["copyright license", "content license"]) },
            [ids.propWikidataPropertyId]: {valueExpr: `"P275"`},
        },
    }),
    // Property: Content Source
    ...createEntry({
        id: ids.propContentSource,
        name: "Source",
        friendlyId: "p-content-source",
        type: schemaIds.property,
        description: "The source where this work was published.",
        features: [
            {featureType: "UseAsProperty", importance: 10},
        ],
        props: {},
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
            // [ids.propWordNet31SynsetId]: { valueExpr: `"03796768-n"` },
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
            // [ids.propWordNet31SynsetId]: { valueExpr: `"02961779-n"` },
            [ids.propWordNetILI]: { valueExpr: `"i51496"` },
        },
    }),
    // Photo of a car (Mini Cooper SE)
    ...createEntry({
        id: ids.imgMiniCooperSe,
        name: "Photo of a MINI Cooper SE",
        friendlyId: "img-mini-cooper-se-martin-katler",
        type: schemaIds.image,
        description: "A photo of a MINI Cooper SE, taken by Martin Katler in Bratislava, Slovenia.",
        features: [{featureType: "Image", dataFileId: files.miniCooperSe.id}],
        rels: [
            {type: schemaIds.imgRelatedTo, to: ids.car},
        ],
        props: {
            [ids.propCreator]: { valueExpr: `markdown("[Martin Katler](https://unsplash.com/@martinkatler)")` },
            [ids.propLicense]: { valueExpr: `markdown("[Unsplash License](https://unsplash.com/license)")` },
            [ids.propContentSource]: { valueExpr: `markdown("[Unsplash](https://unsplash.com/photos/a_Fy7a4KO6g)")` },
        },
    }),
    setHeroImage(ids.car, ids.imgMiniCooperSe),
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

function setHeroImage(entryId: VNID, imageId: VNID): AnyContentEdit {
    return {code: "CreateRelationshipFact", data: {
        id: VNID(),
        fromEntry: entryId,
        toEntry: imageId,
        type: schemaIds.hasHeroImage,
        noteMD: "",
    }};
}
