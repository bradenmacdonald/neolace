import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import {
    assert,
    assertEquals,
    assertRejects,
    createUserWithPermissions,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { AcceptDraft, AddFileToDraft, CreateDraft, UpdateDraft } from "neolace/core/edit/Draft-actions.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { Always, PermissionGrant } from "neolace/core/permissions/grant.ts";

import { EntryValue, FileValue, IntegerValue, PageValue, StringValue } from "../../values.ts";
import { Files } from "./files.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { EntryFunction } from "./entry.ts";

group("files.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    group("tests with files", () => {
        const entryType = VNID("_filesET");
        const entryId = VNID("_filesEntry");

        const createEntry = async () => {
            const graph = await getGraph();
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
                editSource: UseSystemSource,
            }));
        };

        // Create a data file, as if we uploaded a file:
        const uploadPdf = async (args: { size: number; filename: string }) => {
            const graph = await getGraph();
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

        test(`It gives data about the files associated with an entry`, async () => {
            await createEntry();
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
                ], {
                    startedAt: 0n,
                    pageSize: 10n,
                    totalCount: 2n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: undefined,
                }),
            );
        });

        test(`It enforces permissions`, async () => {
            await createEntry();
            const firstPdf = await uploadPdf({ size: 111_000, filename: "first.pdf" });
            const secondPdf = await uploadPdf({ size: 222_000, filename: "second.pdf" });
            const graph = await getGraph();
            // First make the site private:
            await graph.runAsSystem(UpdateSite({
                key: defaultData.site.id,
                accessMode: AccessMode.Private,
            }));

            // Now check if only authorized users can see files:
            const expression = new Files(new LiteralExpression(new EntryValue(entryId)));

            // A user who is not logged in at all:
            const publicResult = await context.evaluateExprConcrete(expression);
            assert(publicResult instanceof PageValue);
            assertEquals(publicResult.values.length, 0);

            // A user with permission to view the entry but not its features (files/article):
            const entryOnlyUser = await createUserWithPermissions(
                new PermissionGrant(Always, [corePerm.viewSite.name, corePerm.viewEntry.name]),
            );
            const entryOnlyResult = await context.evaluateExprConcrete(expression, undefined, entryOnlyUser.userId);
            assert(entryOnlyResult instanceof PageValue);
            assertEquals(entryOnlyResult.values.length, 0);

            // A user with full permission to view files>
            const authorizedUser = await createUserWithPermissions(
                new PermissionGrant(Always, [
                    corePerm.viewSite.name,
                    corePerm.viewEntry.name,
                    corePerm.viewEntryFeatures.name,
                ]),
            );
            const authorizedResult = await context.evaluateExprConcrete(expression, undefined, authorizedUser.userId);
            assert(authorizedResult instanceof PageValue);
            assertEquals(authorizedResult.values.length, 2);
            assert(authorizedResult.values[0].url.startsWith(firstPdf.url));
            assert(authorizedResult.values[1].url.startsWith(secondPdf.url));
        });
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
            new PageValue([], {
                startedAt: 0n,
                pageSize: 10n,
                totalCount: 0n,
                sourceExpression: expression,
                sourceExpressionEntryId: undefined,
            }),
        );
    });

    test(`toString()`, async () => {
        const expression = new Files(
            new EntryFunction(
                new LiteralExpression(
                    new StringValue(
                        defaultData.entries.ponderosaPine.id,
                    ),
                ),
            ),
        );

        assertEquals(expression.toString(), `entry("${defaultData.entries.ponderosaPine.id}").files()`);
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
