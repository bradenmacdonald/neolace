import { C, Field } from "neolace/deps/vertex-framework.ts";
import { LookupExpression } from "../base.ts";
import { FileValue, LazyCypherIterableValue, LazyEntrySetValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { FilesData } from "neolace/core/entry/features/Files/FilesData.ts";
import { DataFile, publicUrlForDataFile } from "neolace/core/objstore/DataFile.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * files([entry or entries])
 *
 * Return an iterable of all file(s) attached to the given entry/entries, sorted by filename.
 */
export class Files extends LookupFunctionOneArg {
    static functionName = "files";
    /** An expression that specifies what entry/entries' files we want to retrieve */
    public get entriesExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LazyCypherIterableValue<FileValue>> {
        const entrySet = await (await this.entriesExpr.getValue(context)).castTo(LazyEntrySetValue, context);
        if (entrySet === undefined) {
            throw new LookupEvaluationError(
                `The expression "${this.entriesExpr.toDebugString()}" cannot be used with files().`,
            );
        }
        // This is an expression that can be used with a WHERE clause to filter to only the entries whose files the
        // user is allowed to view:
        const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewEntryFeatures.name, {}, [
            "entry",
        ]);
        const query = C`
            ${entrySet.cypherQuery}

            WITH entry
            // Enforce permissions
            WHERE ${permissionsPredicate}

            MATCH (entry)-[:${Entry.rel.HAS_FEATURE_DATA}]->(ffd:${FilesData})
            MATCH (ffd)-[rel:${FilesData.rel.HAS_DATA}]->(file:${DataFile})

            WITH rel.displayFilename AS displayFilename, file.filename AS objstoreFilename, file.size AS size, file.contentType AS contentType
        `;
        return new LazyCypherIterableValue<FileValue>(context, async (offset, numItems) => {
            const records = await context.tx.query(C`
                ${query}
                RETURN displayFilename, objstoreFilename, size, contentType
                ORDER BY displayFilename
                SKIP ${C(String(BigInt(offset)))} LIMIT ${C(String(BigInt(numItems)))}
            `.givesShape({
                "displayFilename": Field.String,
                "objstoreFilename": Field.String,
                "size": Field.Int,
                "contentType": Field.String,
            }));

            let totalCount: bigint;
            if (records.length < numItems) totalCount = BigInt(records.length);
            else totalCount = (await context.tx.queryOne(query.RETURN({ "count(*)": Field.BigInt })))["count(*)"];

            const result: FileValue[] = [];
            for (const r of records) {
                result.push(
                    new FileValue(
                        r.displayFilename,
                        await publicUrlForDataFile(r.objstoreFilename, r.displayFilename),
                        r.contentType,
                        r.size,
                    ),
                );
            }
            return { values: result, totalCount };
        }, {
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
        });
    }
}
