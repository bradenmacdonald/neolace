import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import {
    AnnotatedEntryValue,
    InlineMarkdownStringValue,
    IntegerValue,
    NullValue,
    PageValue,
    PropertyValue,
    StringValue,
} from "../values.ts";
import { GetProperty } from "./get.ts";
import { LookupExpression } from "../expression.ts";
import { This } from "./this.ts";
import { LiteralExpression } from "./literal-expr.ts";

group(import.meta, () => {

    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) => graph.read(tx => expr.getValue({tx, siteId, entryId}).then(v => v.makeConcrete()));

    // Literal expressions referencing some properties in the default PlantDB data set:
    const scientificName = new LiteralExpression(new PropertyValue(defaultData.schema.properties._propScientificName.id));
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));
    const hasPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._hasPart.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
        note: new InlineMarkdownStringValue(""),
        slot: new NullValue(),
    };

    group("get() - value property, single entry", () => {

        test(`get() can retrieve a property value for a single entry`, async () => {
            const expression = new GetProperty(new This(), {propertyExpr: scientificName});
            const value = await evalExpression(expression, defaultData.entries.ponderosaPine.id);

            assertEquals(value, new StringValue("Pinus ponderosa"));
        });

        test(`get() returns null if a property is not set`, async () => {
            const expression = new GetProperty(new This(), {propertyExpr: scientificName});
            // The entry "cone" doesn't have a scientific name set:
            const value = await evalExpression(expression, defaultData.entries.cone.id);

            assertEquals(value, new NullValue());
        });

    });

    group("get() - value property, multiple entries", () => {

        // TODO

    });

    group("get() - relationship property", () => {

        test(`Can retrieve a simple IS A relationship property value`, async () => {
            const expression = new GetProperty(new This(), {propertyExpr: partIsAPart});
            const value = await evalExpression(expression, defaultData.entries.seedCone.id);
            // A "seed cone" is a "cone":
            assertEquals(value, new PageValue([
                new AnnotatedEntryValue(cone, {...defaultAnnotations}),
            ], {pageSize: 50n, startedAt: 0n, totalCount: 1n}));
        });

        test(`Can retrieve a simple HAS PART relationship property value`, async () => {
            const expression = new GetProperty(new This(), {propertyExpr: hasPart});
            const value = await evalExpression(expression, defaultData.entries.classPinopsida.id);
            // All conifers (Class Pinopsida) have both male and female cones:
            assertEquals(value, new PageValue([
                new AnnotatedEntryValue(pollenCone, {...defaultAnnotations}),
                new AnnotatedEntryValue(seedCone, {...defaultAnnotations, rank: new IntegerValue(2n)}),
            ], {pageSize: 50n, startedAt: 0n, totalCount: 2n}));
        });
    });
});
/*
// // deno-lint-ignore-file camelcase
// import { VNID } from "neolace/deps/vertex-framework.ts";
// import { RelationshipCategory } from "neolace/deps/neolace-api.ts";

// import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
// import { graph } from "neolace/core/graph.ts";
// import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
// import { getEntryDirectRelationshipFacts } from "neolace/core/entry/relationships.ts";
// import { CreateSite } from "neolace/core/Site.ts";

group(import.meta, () => {

    group("getEntryDirectRelationshipFacts", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("Returns a summary of relationships, grouped by relationship type", async () => {
            // Create this entry tree:
            //
            //      🄰
            //      ⭡ ↘ HAS PARTs
            //      ⭡   🄱, 🄲, 🄳, 🄴, 🄵, 🄶, 🄷, 🄸, 🄹, 🄺, 🄻
            //      ⭡
            //      ⭡ IS A
            //      ⭡
            //      ⭡   🄼
            //      ⭡ ↙ HAS PARTs
            //      🄽 → RELATES TO → 🄾
            //      ⭡ ↘ HAS PARTs      ↘ HAS PARTs
            //      ⭡  🄿, 🅀            🄿  (same 🄿 as earlier on this line)
            //      ⭡
            //      ⭡ IS A
            //      🅁

            const entryType = VNID(), entryIsA = VNID(), entryHasPart = VNID(), entryRelatesTo = VNID();
            const A = VNID(), B = VNID(), C = VNID(), D = VNID(), E = VNID(), F = VNID(), G = VNID(), H = VNID(), I = VNID();
            const J = VNID(), K = VNID(), L = VNID(), M = VNID(), N = VNID(), O = VNID(), P = VNID(), Q = VNID(), R = VNID();

            const A_has_B = VNID(), A_has_C = VNID(), A_has_D = VNID(), A_has_E = VNID(), A_has_F = VNID(), A_has_G = VNID();
            const A_has_H = VNID(), A_has_I = VNID(), A_has_J = VNID(), A_has_K = VNID(), A_has_L = VNID();
            const M_has_N = VNID(), N_rel_O = VNID(), N_has_P = VNID(), N_has_Q = VNID(), O_has_P = VNID();
            const N_isa_A = VNID(), R_isa_N = VNID();

            const {id: siteId} = await graph.runAsSystem(CreateSite({name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));

            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateRelationshipType", data: {category: RelationshipCategory.IS_A, id: entryIsA, nameForward: "is a", nameReverse: "has types"}},
                {code: "CreateRelationshipType", data: {category: RelationshipCategory.HAS_A, id: entryHasPart, nameForward: "has part", nameReverse: "used in"}},
                // TODO: change the HAS_A below to RELATES_TO once RELATES_TO is implemented.
                {code: "CreateRelationshipType", data: {category: RelationshipCategory.HAS_A, id: entryRelatesTo, nameForward: "relates to", nameReverse: "related to"}},
                {code: "UpdateRelationshipType", data: {id: entryIsA, addFromTypes: [entryType], addToTypes: [entryType]}},
                {code: "UpdateRelationshipType", data: {id: entryHasPart, addFromTypes: [entryType], addToTypes: [entryType]}},
                {code: "UpdateRelationshipType", data: {id: entryRelatesTo, addFromTypes: [entryType], addToTypes: [entryType]}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                {code: "CreateEntry", data: {id: D, name: "Entry D", type: entryType, friendlyId: "d", description: ""}},
                {code: "CreateEntry", data: {id: E, name: "Entry E", type: entryType, friendlyId: "e", description: ""}},
                {code: "CreateEntry", data: {id: F, name: "Entry F", type: entryType, friendlyId: "f", description: ""}},
                {code: "CreateEntry", data: {id: G, name: "Entry G", type: entryType, friendlyId: "g", description: ""}},
                {code: "CreateEntry", data: {id: H, name: "Entry H", type: entryType, friendlyId: "h", description: ""}},
                {code: "CreateEntry", data: {id: I, name: "Entry I", type: entryType, friendlyId: "i", description: ""}},
                {code: "CreateEntry", data: {id: J, name: "Entry J", type: entryType, friendlyId: "j", description: ""}},
                {code: "CreateEntry", data: {id: K, name: "Entry K", type: entryType, friendlyId: "k", description: ""}},
                {code: "CreateEntry", data: {id: L, name: "Entry L", type: entryType, friendlyId: "l", description: ""}},
                {code: "CreateEntry", data: {id: M, name: "Entry M", type: entryType, friendlyId: "m", description: ""}},
                {code: "CreateEntry", data: {id: N, name: "Entry N", type: entryType, friendlyId: "n", description: ""}},
                {code: "CreateEntry", data: {id: O, name: "Entry O", type: entryType, friendlyId: "o", description: ""}},
                {code: "CreateEntry", data: {id: P, name: "Entry P", type: entryType, friendlyId: "p", description: ""}},
                {code: "CreateEntry", data: {id: Q, name: "Entry Q", type: entryType, friendlyId: "q", description: ""}},
                {code: "CreateEntry", data: {id: R, name: "Entry R", type: entryType, friendlyId: "r", description: ""}},
                // Relationships:
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: B, id: A_has_B, type: entryHasPart}},  // A has a B
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: C, id: A_has_C, type: entryHasPart}},  // A has a C
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: D, id: A_has_D, type: entryHasPart}},  // A has a D
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: E, id: A_has_E, type: entryHasPart}},  // A has a E
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: F, id: A_has_F, type: entryHasPart}},  // A has a F
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: G, id: A_has_G, type: entryHasPart}},  // A has a G
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: H, id: A_has_H, type: entryHasPart}},  // A has a H
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: I, id: A_has_I, type: entryHasPart}},  // A has a I
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: J, id: A_has_J, type: entryHasPart}},  // A has a J
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: K, id: A_has_K, type: entryHasPart}},  // A has a K
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: L, id: A_has_L, type: entryHasPart}},  // A has a L
                {code: "CreateRelationshipFact", data: {fromEntry: M, toEntry: N, id: M_has_N, type: entryHasPart}},  // M has a N
                {code: "CreateRelationshipFact", data: {fromEntry: N, toEntry: O, id: N_rel_O, type: entryRelatesTo}},  // N relates to O
                {code: "CreateRelationshipFact", data: {fromEntry: N, toEntry: P, id: N_has_P, type: entryHasPart}},  // N has a P
                {code: "CreateRelationshipFact", data: {fromEntry: N, toEntry: Q, id: N_has_Q, type: entryHasPart}},  // N has a Q
                {code: "CreateRelationshipFact", data: {fromEntry: O, toEntry: P, id: O_has_P, type: entryHasPart}},  // O has a P
                {code: "CreateRelationshipFact", data: {fromEntry: N, toEntry: A, id: N_isa_A, type: entryIsA}},  // N is a A
                {code: "CreateRelationshipFact", data: {fromEntry: R, toEntry: N, id: R_isa_N, type: entryIsA}},  // R is a N
            ]}));

            // Check the relationships of 🅁
            assertEquals(await graph.read(tx => getEntryDirectRelationshipFacts(R, tx)), [
                {direction: "from", relType: {id: entryIsA}, relFactsCount: 1, relFacts: [
                    {id: R_isa_N, entry: {id: N, name: "Entry N", friendlyId: "n", entryType: {id: entryType}}},
                ]},
            ]);

            // Check the relationships of 🄰
            assertEquals(await graph.read(tx => getEntryDirectRelationshipFacts(A, tx)), [
                {direction: "from", relType: {id: entryHasPart}, relFactsCount: 11, relFacts: [
                    {id: A_has_B, entry: {id: B, name: "Entry B", friendlyId: "b", entryType: {id: entryType}}},
                    {id: A_has_C, entry: {id: C, name: "Entry C", friendlyId: "c", entryType: {id: entryType}}},
                    {id: A_has_D, entry: {id: D, name: "Entry D", friendlyId: "d", entryType: {id: entryType}}},
                    {id: A_has_E, entry: {id: E, name: "Entry E", friendlyId: "e", entryType: {id: entryType}}},
                    {id: A_has_F, entry: {id: F, name: "Entry F", friendlyId: "f", entryType: {id: entryType}}},
                    {id: A_has_G, entry: {id: G, name: "Entry G", friendlyId: "g", entryType: {id: entryType}}},
                    {id: A_has_H, entry: {id: H, name: "Entry H", friendlyId: "h", entryType: {id: entryType}}},
                    {id: A_has_I, entry: {id: I, name: "Entry I", friendlyId: "i", entryType: {id: entryType}}},
                    {id: A_has_J, entry: {id: J, name: "Entry J", friendlyId: "j", entryType: {id: entryType}}},
                    {id: A_has_K, entry: {id: K, name: "Entry K", friendlyId: "k", entryType: {id: entryType}}},
                    // L will not be included because results are limited to 10 per page by default
                ]},
                {direction: "to", relType: {id: entryIsA}, relFactsCount: 1, relFacts: [
                    {id: N_isa_A, entry: {id: N, name: "Entry N", friendlyId: "n", entryType: {id: entryType}}},
                ]},
            ]);
            // If we "skip" to the second page, we can see the remaining relationships:
            assertEquals(await graph.read(tx => getEntryDirectRelationshipFacts(A, tx, {relTypeId: entryHasPart, skip: 10})), [
                {direction: "from", relType: {id: entryHasPart}, relFactsCount: 11, relFacts: [
                    {id: A_has_L, entry: {id: L, name: "Entry L", friendlyId: "l", entryType: {id: entryType}}},
                ]},
            ]);

            // Check the relationships of 🄽
            assertEquals(await graph.read(tx => getEntryDirectRelationshipFacts(N, tx)), [
                {direction: "from", relType: {id: entryHasPart}, relFactsCount: 2, relFacts: [
                    {id: N_has_P, entry: {id: P, name: "Entry P", friendlyId: "p", entryType: {id: entryType}}},
                    {id: N_has_Q, entry: {id: Q, name: "Entry Q", friendlyId: "q", entryType: {id: entryType}}},
                ]},
                {direction: "from", relType: {id: entryIsA}, relFactsCount: 1, relFacts: [
                    {id: N_isa_A, entry: {id: A, name: "Entry A", friendlyId: "a", entryType: {id: entryType}}},
                ]},
                {direction: "from", relType: {id: entryRelatesTo}, relFactsCount: 1, relFacts: [
                    {id: N_rel_O, entry: {id: O, name: "Entry O", friendlyId: "o", entryType: {id: entryType}}},
                ]},
                {direction: "to", relType: {id: entryHasPart}, relFactsCount: 1, relFacts: [
                    {id: M_has_N, entry: {id: M, name: "Entry M", friendlyId: "m", entryType: {id: entryType}}},
                ]},
                {direction: "to", relType: {id: entryIsA}, relFactsCount: 1, relFacts: [
                    {id: R_isa_N, entry: {id: R, name: "Entry R", friendlyId: "r", entryType: {id: entryType}}},
                ]},
            ]);

        });

    });
});
*/
