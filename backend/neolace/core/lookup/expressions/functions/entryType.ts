import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

import { LookupExpression } from "../base.ts";
import { EntryTypeValue, EntryValue, LookupValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * entryType(key or entry): get an entry type, either by key or from an entry
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
            // it's from the same site. That is sufficient to give them "access" to this entryType. They only need the
            // additional "viewSchema" to *list* all entry types/properties on the site.
            try {
                const data = await context.tx.queryOne(C`
                    MATCH (entry:${Entry} {id: ${arg.id}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})
                `.RETURN({ "entryType.key": Field.String }));
                return new EntryTypeValue(data["entryType.key"]);
            } catch (err) {
                if (err instanceof EmptyResultError) {
                    throw new LookupEvaluationError("Entry not found.");
                }
                throw err;
            }
        } else {
            // This is the key of an entry type.
            // Viewing a single entry type whose key the user already knows does not require 'schema' permission;
            // the schema permission is only required to *list* all properties / entry types of a site.
            const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewSite.name, {}, [
                "entryType",
            ]);
            try {
                const data = await context.tx.queryOne(C`
                    MATCH (entryType:${EntryType} {siteNamespace: ${context.siteId}, key: ${arg.value}})
                    WHERE ${permissionsPredicate}
                `.RETURN({ "entryType.key": Field.String }));
                return new EntryTypeValue(data["entryType.key"]);
            } catch (err) {
                if (err instanceof EmptyResultError) {
                    throw new LookupEvaluationError("Entry Type not found.");
                }
                throw err;
            }
        }
    }
}
