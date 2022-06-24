import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";

import { LookupExpression } from "../base.ts";
import { EntryTypeValue, EntryValue, LookupValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * entryType(ID or entry): get an entry type, either by ID or from an entry
 */
export class EntryTypeFunction extends LookupFunctionOneArg {
    static functionName = "entryType";

    /** An expression that specifies the VNID of the entry type or an entry whose type we want */
    public get entryOrIdExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const arg = await this.entryOrIdExpr.getValueAsOneOf([EntryValue, StringValue], context);

        if (arg instanceof EntryValue) {
            // Get the type of the specified entry.

            // Note: at this point we already know that the user has permission to view the entry specified, and that
            // it's from the same site.
            const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewSchema.name, {}, [
                "entry",
                "entryType",
            ]);
            try {
                const data = await context.tx.queryOne(C`
                    MATCH (entry:${Entry} {id: ${arg.id}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
                    WHERE ${permissionsPredicate}
                `.RETURN({ "entryType.id": Field.VNID }));
                return new EntryTypeValue(data["entryType.id"]);
            } catch (err) {
                if (err instanceof EmptyResultError) {
                    throw new LookupEvaluationError("Entry not found.");
                }
                throw err;
            }
        } else {
            // This is the VNID of an entry type.
            const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewSchema.name, {}, [
                "entryType",
            ]);
            try {
                const data = await context.tx.queryOne(C`
                    MATCH (entryType:${EntryType} {id: ${arg.value}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${context.siteId}})
                    WHERE ${permissionsPredicate}
                `.RETURN({ "entryType.id": Field.VNID }));
                return new EntryTypeValue(data["entryType.id"]);
            } catch (err) {
                if (err instanceof EmptyResultError) {
                    throw new LookupEvaluationError("Entry Type not found.");
                }
                throw err;
            }
        }
    }
}
