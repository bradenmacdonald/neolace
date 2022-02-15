import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import { assert, assertEquals, assertRejects, beforeAll, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { EntryValue, FileValue, IntegerValue, PageValue } from "../values.ts";
import { Files } from "./files.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupExpression } from "../expression.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { CreateDataFile, DataFile } from "../../objstore/DataFile.ts";
import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        graph.read((tx) => expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n }).then((v) => v.makeConcrete()));
    const siteId = defaultData.site.id;

    beforeAll(async () => {
    });

    group("files()", () => {
        test(`It gives data about the files associated with an entry`, async () => {
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
            const expression = new Files(new LiteralExpression(new EntryValue(entryId)), {});

            const result = await evalExpression(expression);

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
                ], { startedAt: 0n, pageSize: 10n, totalCount: 2n }),
            );
        });

        test(`It gives an empty list value when used with non-file entries`, async () => {
            const expression = new Files(
                new LiteralExpression(
                    new EntryValue(
                        defaultData.entries.ponderosaPine.id,
                    ),
                ),
                {},
            );

            assertEquals(
                await evalExpression(expression),
                new PageValue([], { startedAt: 0n, pageSize: 10n, totalCount: 0n }),
            );
        });

        test(`It gives an error message when used with non-entries`, async () => {
            const expression = new Files(new LiteralExpression(new IntegerValue(123n)), {});

            await assertRejects(
                () => evalExpression(expression),
                LookupEvaluationError,
                `The expression "123" cannot be used with files().`,
            );
        });
    });
});
