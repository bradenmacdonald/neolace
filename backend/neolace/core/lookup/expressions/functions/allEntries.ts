import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";

import { LazyEntrySetValue, LookupValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunction } from "./base.ts";

/**
 * allEntries(): Return all entries on the current site [that the user has permission to see].
 */
export class AllEntries extends LookupFunction {
    static functionName = "allEntries";

    public async getValue(context: LookupContext): Promise<LookupValue> {
        return new LazyEntrySetValue(
            context,
            C`
                MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})

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
