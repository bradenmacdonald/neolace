import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";

import { LazyEntrySetValue, LookupValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunction } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

/**
 * allEntries(): Return all entries on the current site [that the user has permission to see].
 */
export class AllEntries extends LookupFunction {
    static functionName = "allEntries";

    public async getValue(context: LookupContext): Promise<LookupValue> {
        // Cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
        const entryPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
            "entryType",
        ]);

        return new LazyEntrySetValue(
            context,
            C`
                MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
                WHERE ${entryPermissionPredicate}

                WITH entry, {} AS annotations
                ORDER BY entry.name
                WITH entry, annotations
            `,
            {
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
