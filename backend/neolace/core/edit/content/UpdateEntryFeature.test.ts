import {
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { Vertex } from "neolace/deps/vertex-framework.ts";
import { getGraph } from "neolace/core/graph.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { AppliedEdit } from "../AppliedEdit.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";

group("UpdateEntryFeature edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const getArticleContent = (graph: Vertex) =>
        graph.read((tx) => getEntryFeaturesData(ponderosaPine.id, { tx })).then((fd) => fd.Article?.articleContent);

    test("UpdateEntryFeature can change an entry's article text", async () => {
        const graph = await getGraph();
        const originalArticleText = await getArticleContent(graph);
        assert(originalArticleText?.includes("The bark helps to distinguish it from other species."));
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [{
                code: "UpdateEntryFeature",
                data: {
                    entryId: ponderosaPine.id,
                    feature: { featureType: "Article", articleContent: "New article content" },
                },
            }],
            editSource: UseSystemSource,
        }));
        assertEquals(await getArticleContent(graph), "New article content");
        assertEquals(result.actionDescription, `Updated Article feature of \`Entry ${ponderosaPine.id}\``);
        assertEquals(result.appliedEditIds.length, 1);
    });

    test("UpdateEntryFeature records the previous name.", async () => {
        const graph = await getGraph();
        const originalArticleText = await getArticleContent(graph);
        assert(originalArticleText?.includes("The bark helps to distinguish it from other species."));
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [{
                code: "UpdateEntryFeature",
                data: {
                    entryId: ponderosaPine.id,
                    feature: { featureType: "Article", articleContent: "New article content" },
                },
            }],
            editSource: UseSystemSource,
        }));
        assertEquals(result.appliedEditIds.length, 1);
        const appliedEdit = await graph.pullOne(AppliedEdit, (a) => a.oldData, { key: result.appliedEditIds[0] });
        assertEquals(appliedEdit.oldData, { articleContent: originalArticleText as string });
    });

    test("UpdateEntryFeature will not change the graph if the article text is the same.", async () => {
        const graph = await getGraph();
        const originalArticleText = await getArticleContent(graph);
        assert(originalArticleText?.includes("The bark helps to distinguish it from other species."));
        const result = await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [{
                code: "UpdateEntryFeature",
                data: {
                    entryId: ponderosaPine.id,
                    feature: { featureType: "Article", articleContent: originalArticleText },
                },
            }],
            editSource: UseSystemSource,
        }));
        // We confirm now that no changes were actually made:
        assertEquals(await getArticleContent(graph), originalArticleText);
        assertEquals(result.actionDescription, "(no changes)");
        assertEquals(result.appliedEditIds, []);
    });

    test("UpdateEntryFeature cannot change the article text of an entry that doesn't exist", async () => {
        const graph = await getGraph();
        const invalidEntryId = VNID("_foobar843758943");
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId,
                    edits: [{
                        code: "UpdateEntryFeature",
                        data: {
                            entryId: invalidEntryId,
                            feature: { featureType: "Article", articleContent: "new article text" },
                        },
                    }],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, invalidEntryId);
        assertEquals(
            err.cause.message,
            "Cannot set feature data for that entry - either the feature is not enabled or the entry ID is invalid.",
        );
    });

    test("UpdateEntryFeature cannot change the article text of an entry from another site", async () => {
        const graph = await getGraph();
        const err = await assertRejects(
            () =>
                graph.runAsSystem(ApplyEdits({
                    siteId: defaultData.otherSite.id,
                    edits: [{
                        code: "UpdateEntryFeature",
                        data: {
                            entryId: ponderosaPine.id,
                            feature: { featureType: "Article", articleContent: "new text" },
                        },
                    }],
                    editSource: UseSystemSource,
                })),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(err.cause.context.entryId, ponderosaPine.id);
        assertEquals(
            err.cause.message,
            "Cannot set feature data for that entry - either the feature is not enabled or the entry ID is invalid.",
        );
    });
});
