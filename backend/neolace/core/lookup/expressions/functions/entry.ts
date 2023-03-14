/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, EmptyResultError, Field, isVNID } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";

import { LookupExpression } from "../base.ts";
import { EntryValue, LookupValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * entry(ID, key): get an entry, either by ID or key
 */
export class EntryFunction extends LookupFunctionOneArg {
    static functionName = "entry";

    /** An expression that specifies the VNID or key of the entry we want */
    public get idExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const idString = (await this.idExpr.getValueAs(StringValue, context)).value;
        // Allow looking up entries by ID (VNID) or key:
        const key = isVNID(idString) ? C`{id: ${idString}}` : C`{siteNamespace: ${context.siteId}, key: ${idString}}`;

        // Check if the user has permission to view this entry:
        const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
            "entryType",
        ]);
        try {
            const data = await context.tx.queryOne(C`
                MATCH (entry:${Entry} ${key}),
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
