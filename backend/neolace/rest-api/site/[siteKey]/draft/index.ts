/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as log from "std/log/mod.ts";
import { C, Field } from "neolace/deps/vertex-framework.ts";

import { Site } from "neolace/core/Site.ts";
import { adaptErrors, getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { CreateDraft } from "neolace/core/edit/Draft-actions.ts";
import { checkPermissionsRequiredForEdits, getDraft } from "./_helpers.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { User } from "neolace/core/User.ts";

export class DraftIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/draft"];

    POST = this.method({
        requestBodySchema: SDK.CreateDraftSchema,
        responseSchema: SDK.DraftSchema,
        description: "Create a new draft",
    }, async ({ request, bodyData }) => {
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);
        const userId = this.requireUser(request).id;

        // Response:
        const edits = bodyData.edits as SDK.EditList;
        // We don't allow creating an empty draft as it's noisy for other users and we can't really check permissions
        // until we know what type of edits will be in the draft.
        if (edits.length === 0) {
            // By default, we allow creating an empty draft IFF the user has "create new entry" permission
            this.requirePermission(request, SDK.CorePerm.proposeNewEntry);
        }

        for (const idx in edits) {
            const e = edits[idx]; // The payload validator will have checked that "e" has .code and .data, but not check their value
            const editType = SDK.getEditType.OrNone(e.code);
            if (editType === undefined) {
                throw new SDK.InvalidFieldValue([{
                    fieldPath: `edits.${idx}.code`,
                    message: `Invalid edit code: "${e.code}"`,
                }]);
            }
            // Validate the data too:
            try {
                editType.dataSchema(e.data);
            } catch (err) {
                log.warning(`Found invalid edit - data was:`);
                log.warning(e.data);
                throw new SDK.InvalidFieldValue([{
                    fieldPath: `edits.${idx}.data`,
                    message: `Invalid edit data for ${e.code} edit: "${err.message}"`,
                }]);
            }
        }

        await checkPermissionsRequiredForEdits(edits, await this.getPermissionSubject(request), "propose");

        const { id } = await graph.runAs(
            userId,
            CreateDraft({
                siteId,
                authorId: userId,
                title: bodyData.title,
                description: bodyData.description,
                edits,
            }),
        ).catch(adaptErrors("title", "description", adaptErrors.remap("data", "edits.?.data")));

        // Response:
        return await graph.read((tx) => getDraft(id, tx));
    });

    GET = this.method({
        responseSchema: SDK.schemas.PaginatedResult(SDK.DraftSchema),
        description: "List all drafts",
    }, async ({ request }) => {
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);
        const subject = await this.getPermissionSubject(request);

        // Cypher clause/predicate that we can use to filter out drafts that the user is not allowed to see.
        const permissionsPredicate = await makeCypherCondition(subject, SDK.CorePerm.viewDraft, {}, ["draft"]);

        // Are we filtering by status?
        let statusFilter = C``;
        const statusFilterParam = request.queryParam("status");
        if (statusFilterParam) {
            statusFilter = C`AND draft.status = ${BigInt(statusFilterParam)}`;
        }

        const pageNum = BigInt(request.queryParam("page") ?? 1n) - 1n;
        if (pageNum < 0) {
            throw new SDK.InvalidFieldValue([{ fieldPath: "page", message: "Invalid page number" }]);
        }
        const pageSize = 20n;
        const skip = BigInt(pageNum * pageSize);

        const [data, countData] = await Promise.all([
            graph.read(async (tx) => {
                return await tx.query(C`
                    MATCH (draft:${Draft})-[:${Draft.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                    WHERE ${permissionsPredicate} ${statusFilter}

                    WITH draft
                    MATCH (draft:${Draft})-[:${Draft.rel.AUTHORED_BY}]->(author:${User})

                    RETURN
                        draft {.num, .title, .description, .created, .status},
                        {fullName: author.fullName, username: author.username} AS author
                    ORDER BY draft.created DESC
                    SKIP ${skip} LIMIT ${pageSize}
                `.givesShape({
                    draft: Field.Record({
                        num: Field.Int,
                        title: Field.String,
                        description: Field.String,
                        created: Field.DateTime,
                        status: Field.Int,
                    }),
                    author: Field.Record({
                        fullName: Field.String,
                        username: Field.Slug,
                    }),
                }));
            }),
            // Load the total number of drafts in parallel:
            graph.read(async (tx) => {
                return await tx.queryOne(C`
                    MATCH (draft:${Draft})-[:${Draft.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                    WHERE ${permissionsPredicate}
                `.RETURN({ "count(draft)": Field.Int }));
            }),
        ]);

        const result: SDK.schemas.PaginatedResultData<SDK.DraftData> = {
            values: data.map((row) => ({
                ...row.draft,
                author: row.author,
            })),
            totalCount: countData["count(draft)"],
        };
        return result;
    });
}
