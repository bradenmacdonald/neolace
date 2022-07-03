import { C, EmptyResultError, Field, isVNID } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site, siteCodeForSite } from "neolace/core/Site.ts";

import { LookupExpression } from "../base.ts";
import { EntryValue, LookupValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * entry(ID, friendlyId): get an entry, either by ID or friendlyId
 */
export class EntryFunction extends LookupFunctionOneArg {
    static functionName = "entry";

    /** An expression that specifies the VNID or friendlyId of the entry we want */
    public get idExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const idString = (await this.idExpr.getValueAs(StringValue, context)).value;
        // If the idString is a VNID we can use it as-is, but for friendlyid we need to convert it to "slugId":
        const key = isVNID(idString) ? idString : (await siteCodeForSite(context.siteId)) + idString;

        // Check if the user has permission to view this entry:
        const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
            "entryType",
        ]);
        try {
            const data = await context.tx.queryOne(C`
                MATCH (entry:${Entry}), entry HAS KEY ${key},
                    (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType}),
                    (entryType)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${context.siteId}})
                WHERE ${permissionsPredicate}
            `.RETURN({ "entry.id": Field.VNID }));
            return new EntryValue(data["entry.id"]);
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new LookupEvaluationError(`Entry "${idString}" not found.`);
            }
            throw err;
        }
    }
}
