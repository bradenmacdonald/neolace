import { C, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";

import { LookupExpression } from "../base.ts";
import {
    EntryTypeValue,
    EntryValue,
    LazyCypherIterableValue,
    LookupValue,
    PropertyValue,
    StringValue,
} from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { Property } from "neolace/core/schema/Property.ts";

/**
 * basicSearch(term): search for entries, properties, and entry types whose name or key contains the specified
 * keyword.
 */
export class BasicSearch extends LookupFunctionOneArg {
    static functionName = "basicSearch";

    /** An expression that specifies the keyword(s) we want to search for */
    public get keywordString(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const keywordValue = await this.keywordString.getValueAs(StringValue, context);
        const keyword = keywordValue.value.toLowerCase();

        // Cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
        const entryPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
            "entryType",
        ]);
        // Cypher clause/predicate that tells us if the user is allowed to view properties/entryTypes on this site.
        const schemaPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewSchema.name, {}, []);

        // TODO: we should store the lowercase version of the name and key in the database, with a "full text" index
        const cypherQuery = C`
            CALL {
                MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${context.siteId}})
                WHERE (${entryPermissionPredicate}) AND (toLower(entry.name) CONTAINS ${keyword} OR toLower(entry.key) CONTAINS ${keyword})
                RETURN
                    "Entry" AS type,
                    entry.id AS idOrKey,
                    entry.name AS name,
                    CASE WHEN toLower(entry.name) = ${keyword} OR entry.key = ${keyword} THEN 1 ELSE 0 END AS isExactMatch

                UNION ALL

                MATCH (entryTypeOrProperty)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${context.siteId}})
                WHERE (entryTypeOrProperty:${EntryType} OR entryTypeOrProperty:${Property})
                  AND (${schemaPermissionPredicate})
                  AND (toLower(entryTypeOrProperty.name) CONTAINS ${keyword})
                RETURN
                    CASE WHEN entryTypeOrProperty:${EntryType} THEN "EntryType" ELSE "Property" END AS type,
                    entryTypeOrProperty.key AS idOrKey,
                    entryTypeOrProperty.name AS name,
                    CASE WHEN toLower(entryTypeOrProperty.name) = ${keyword} THEN 1 ELSE 0 END AS isExactMatch
            }
        `;

        return new LazyCypherIterableValue<EntryValue | EntryTypeValue | PropertyValue>(
            context,
            cypherQuery,
            async (offset, numItems) => {
                const records = await context.tx.query(C`
                ${cypherQuery}
                RETURN type, idOrKey, name
                ORDER BY isExactMatch DESC, name, type, idOrKey
                SKIP ${C(String(BigInt(offset)))} LIMIT ${C(String(BigInt(numItems)))}
            `.givesShape({
                    "type": Field.String,
                    "idOrKey": Field.Any,
                    "name": Field.String,
                }));

                const result: Array<EntryValue | EntryTypeValue | PropertyValue> = [];
                for (const r of records) {
                    if (r.type === "Entry") {
                        result.push(new EntryValue(r.idOrKey));
                    } else if (r.type === "EntryType") {
                        result.push(new EntryTypeValue(r.idOrKey));
                    } else if (r.type === "Property") {
                        result.push(new PropertyValue(r.idOrKey));
                    } else throw new Error("Internal Error, unexpected type found in query result.");
                }
                return result;
            },
            {
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
