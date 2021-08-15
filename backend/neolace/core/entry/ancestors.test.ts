import { VNID } from "neolace/deps/vertex-framework.ts";
import { RelationshipCategory } from "neolace/deps/neolace-api.ts";

import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { CreateSite } from "neolace/core/Site.ts";

group(import.meta, () => {

    group("getEntryAncestors", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        test("Returns only the shortest distance to duplicate ancestors", async () => {
            // Create this entry tree:
            //     A    B
            //    / \  /  \
            //   C   D     E
            //    \ /     /|
            //     F    /  |  G
            //      \ /    | /
            //       H     I

            const entryType = VNID(), entryIsA = VNID();
            const A = VNID(), B = VNID(), C = VNID(), D = VNID(), E = VNID(), F = VNID(), G = VNID(), H = VNID(), I = VNID();

            const {id: siteId} = await graph.runAsSystem(CreateSite({domain: "test-site.neolace.net", slugId: "site-test"}));

            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateRelationshipType", data: {category: RelationshipCategory.IS_A, id: entryIsA, nameForward: "is a", nameReverse: "has"}},
                // TODO: fix the need for all these "undefined" entries:
                {code: "UpdateRelationshipType", data: {id: entryIsA, addFromTypes: [entryType], addToTypes: [entryType], nameForward: undefined, nameReverse: undefined, description: undefined, removeFromTypes: undefined, removeToTypes: undefined}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                {code: "CreateEntry", data: {id: D, name: "Entry D", type: entryType, friendlyId: "d", description: ""}},
                {code: "CreateEntry", data: {id: E, name: "Entry E", type: entryType, friendlyId: "e", description: ""}},
                {code: "CreateEntry", data: {id: F, name: "Entry F", type: entryType, friendlyId: "f", description: ""}},
                {code: "CreateEntry", data: {id: G, name: "Entry G", type: entryType, friendlyId: "g", description: ""}},
                {code: "CreateEntry", data: {id: H, name: "Entry H", type: entryType, friendlyId: "h", description: ""}},
                {code: "CreateEntry", data: {id: I, name: "Entry I", type: entryType, friendlyId: "i", description: ""}},
                {code: "CreateRelationshipFact", data: {fromEntry: C, toEntry: A, id: VNID(), type: entryIsA}},  // C is a A
                {code: "CreateRelationshipFact", data: {fromEntry: D, toEntry: A, id: VNID(), type: entryIsA}},  // D is a A
                {code: "CreateRelationshipFact", data: {fromEntry: D, toEntry: B, id: VNID(), type: entryIsA}},  // D is a B
                {code: "CreateRelationshipFact", data: {fromEntry: E, toEntry: B, id: VNID(), type: entryIsA}},  // E is a B
                {code: "CreateRelationshipFact", data: {fromEntry: F, toEntry: C, id: VNID(), type: entryIsA}},  // F is a C
                {code: "CreateRelationshipFact", data: {fromEntry: F, toEntry: D, id: VNID(), type: entryIsA}},  // F is a D
                {code: "CreateRelationshipFact", data: {fromEntry: H, toEntry: F, id: VNID(), type: entryIsA}},  // H is a F
                {code: "CreateRelationshipFact", data: {fromEntry: H, toEntry: E, id: VNID(), type: entryIsA}},  // H is a E
                {code: "CreateRelationshipFact", data: {fromEntry: I, toEntry: E, id: VNID(), type: entryIsA}},  // I is a E
                {code: "CreateRelationshipFact", data: {fromEntry: I, toEntry: G, id: VNID(), type: entryIsA}},  // I is a G
            ]}));

            // Check the ancestor of C.
            assertEquals(await graph.read(tx => getEntryAncestors(C, tx)), [
                {distance: 1, id: A, name: "Entry A", friendlyId: "a", entryType: {id: entryType}},
            ]);

            // Check the ancestor of I. Expect 2 immediate ancestors (E & G), plus one ancestor B at distance of 2.
            assertEquals(await graph.read(tx => getEntryAncestors(I, tx)), [
                {distance: 1, id: E, name: "Entry E", friendlyId: "e", entryType: {id: entryType}},
                {distance: 1, id: G, name: "Entry G", friendlyId: "g", entryType: {id: entryType}},
                {distance: 2, id: B, name: "Entry B", friendlyId: "b", entryType: {id: entryType}},
            ]);

            // Check the ancestors of H.
            // We should find that H has 6 ancestors, and the distance from H to B is 2, from H to A is 3, and from H to E is 1
            assertEquals(await graph.read(tx => getEntryAncestors(H, tx)), [
                // Sorted first by distance then alphabetically, so E is before F:
                {distance: 1, id: E, name: "Entry E", friendlyId: "e", entryType: {id: entryType}},
                {distance: 1, id: F, name: "Entry F", friendlyId: "f", entryType: {id: entryType}},
                {distance: 2, id: B, name: "Entry B", friendlyId: "b", entryType: {id: entryType}},
                {distance: 2, id: C, name: "Entry C", friendlyId: "c", entryType: {id: entryType}},
                {distance: 2, id: D, name: "Entry D", friendlyId: "d", entryType: {id: entryType}},
                {distance: 3, id: A, name: "Entry A", friendlyId: "a", entryType: {id: entryType}},
            ]);

        });

        test("Works despite cyclic relationships", async () => {
            // Create this entry tree:
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D 
            //      \
            //       A (same A as above)

            const entryType = VNID(), entryIsA = VNID();
            const A = VNID(), B = VNID(), C = VNID(), D = VNID();

            const {id: siteId} = await graph.runAsSystem(CreateSite({domain: "test-site.neolace.net", slugId: "site-test"}));

            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateRelationshipType", data: {category: RelationshipCategory.IS_A, id: entryIsA, nameForward: "is a", nameReverse: "has"}},
                // TODO: fix the need for all these "undefined" entries:
                {code: "UpdateRelationshipType", data: {id: entryIsA, addFromTypes: [entryType], addToTypes: [entryType], nameForward: undefined, nameReverse: undefined, description: undefined, removeFromTypes: undefined, removeToTypes: undefined}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                {code: "CreateEntry", data: {id: D, name: "Entry D", type: entryType, friendlyId: "d", description: ""}},
                {code: "CreateRelationshipFact", data: {fromEntry: B, toEntry: A, id: VNID(), type: entryIsA}},  // B is a A
                {code: "CreateRelationshipFact", data: {fromEntry: C, toEntry: A, id: VNID(), type: entryIsA}},  // C is a A
                {code: "CreateRelationshipFact", data: {fromEntry: D, toEntry: B, id: VNID(), type: entryIsA}},  // D is a B
                {code: "CreateRelationshipFact", data: {fromEntry: D, toEntry: C, id: VNID(), type: entryIsA}},  // D is a C
                {code: "CreateRelationshipFact", data: {fromEntry: A, toEntry: D, id: VNID(), type: entryIsA}},  // A is a D
            ]}));

            // Check the ancestor of D.
            assertEquals(await graph.read(tx => getEntryAncestors(D, tx)), [
                {distance: 1, id: B, name: "Entry B", friendlyId: "b", entryType: {id: entryType}},
                {distance: 1, id: C, name: "Entry C", friendlyId: "c", entryType: {id: entryType}},
                {distance: 2, id: A, name: "Entry A", friendlyId: "a", entryType: {id: entryType}},
            ]);

            // Check the ancestor of A.
            assertEquals(await graph.read(tx => getEntryAncestors(A, tx)), [
                {distance: 1, id: D, name: "Entry D", friendlyId: "d", entryType: {id: entryType}},
                {distance: 2, id: B, name: "Entry B", friendlyId: "b", entryType: {id: entryType}},
                {distance: 2, id: C, name: "Entry C", friendlyId: "c", entryType: {id: entryType}},
            ]);
        });

    })
});
