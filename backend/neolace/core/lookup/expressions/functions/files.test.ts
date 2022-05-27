import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import {
    assert,
    assertEquals,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft.ts";

import { EntryValue, FileValue, IntegerValue, PageValue } from "../../values.ts";
import { Files } from "./files.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";

group("files.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It gives data about the files associated with an entry`, async () => {
        const graph = await getGraph();
        ////////////////////////////////////////////////////////////////////////////
        // Create an entry to use for this test:
        const entryType = VNID();
        const entryId = VNID();
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryTypeWithFiles" } },
                {
                    code: "UpdateEntryTypeFeature",
                    data: {
                        entryTypeId: entryType,
                        feature: {
                            featureType: "Files",
                            enabled: true,
                            config: {},
                        },
                    },
                },
                // Create an entry:
                {
                    code: "CreateEntry",
                    data: {
                        id: entryId,
                        type: entryType,
                        name: "Test With Files",
                        friendlyId: "files-test",
                        description: "An Entry with Files, for Testing",
                    },
                },
            ],
        }));

        ////////////////////////////////////////////////////////////////////////////
        // Create a data file, as if we uploaded a file:
        const uploadPdf = async (args: { size: number; filename: string }) => {
            const dataFile = {
                id: VNID(),
                sha256Hash: "e0b56bc58b5b4ac8b6f9a3e0fc5083d4c7f447738ef39241377687d6bfcef0e6",
                filename: "random-filename-on-obj-store.pdf", // This filename is the filename on object storage, usually a UUID
                contentType: "application/pdf",
                size: args.size,
                metadata: {},
            };
            await graph.runAsSystem(CreateDataFile(dataFile));
            const url = (await graph.pullOne(DataFile, (df) => df.publicUrl(), { key: dataFile.id })).publicUrl;

            // Now set the data file as this entry's attached file:
            const draft = await graph.runAsSystem(CreateDraft({
                title: "Files Test Draft",
                description: "testing",
                siteId,
                authorId: SYSTEM_VNID,
                edits: [],
            }));
            const { id: draftFileId } = await graph.runAsSystem(
                AddFileToDraft({ draftId: draft.id, dataFileId: dataFile.id }),
            );
            await graph.runAsSystem(UpdateDraft({
                key: draft.id,
                addEdits: [
                    {
                        code: "UpdateEntryFeature",
                        data: {
                            entryId,
                            feature: {
                                featureType: "Files",
                                changeType: "addFile",
                                filename: args.filename,
                                draftFileId,
                            },
                        },
                    },
                ],
            }));
            await graph.runAsSystem(AcceptDraft({ id: draft.id }));
            return { url, ...args };
        };

        const firstPdf = await uploadPdf({ size: 111_000, filename: "first.pdf" });
        const secondPdf = await uploadPdf({ size: 222_000, filename: "second.pdf" });

        ////////////////////////////////////////////////////////////////////////////
        // Now test files()

        // entry.files()
        const expression = new Files(new LiteralExpression(new EntryValue(entryId)));

        const result = await context.evaluateExprConcrete(expression);

        assert(result instanceof PageValue);
        assert(result.values[0].url.startsWith(firstPdf.url));
        assert(result.values[1].url.startsWith(secondPdf.url));
        assertEquals(
            result,
            new PageValue([
                new FileValue(
                    "first.pdf",
                    result.values[0].url,
                    "application/pdf",
                    firstPdf.size,
                ),
                new FileValue(
                    "second.pdf",
                    result.values[1].url,
                    "application/pdf",
                    secondPdf.size,
                ),
            ], { startedAt: 0n, pageSize: 10n, totalCount: 2n, sourceExpression: expression }),
        );
    });

    test(`It gives an empty list value when used with non-file entries`, async () => {
        const expression = new Files(
            new LiteralExpression(
                new EntryValue(
                    defaultData.entries.ponderosaPine.id,
                ),
            ),
        );

        assertEquals(
            await context.evaluateExprConcrete(expression),
            new PageValue([], { startedAt: 0n, pageSize: 10n, totalCount: 0n, sourceExpression: expression }),
        );
    });

    test(`toString()`, async () => {
        const expression = new Files(
            new LiteralExpression(
                new EntryValue(
                    defaultData.entries.ponderosaPine.id,
                ),
            ),
        );

        assertEquals(expression.toString(), `files([[/entry/${defaultData.entries.ponderosaPine.id}]])`);
    });

    test(`It gives an error message when used with non-entries`, async () => {
        const expression = new Files(new LiteralExpression(new IntegerValue(123n)));

        await assertRejects(
            () => context.evaluateExprConcrete(expression),
            LookupEvaluationError,
            `The expression "123" cannot be used with files().`,
        );
    });
});