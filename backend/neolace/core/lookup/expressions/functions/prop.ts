import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";

import { Property } from "neolace/core/schema/Property.ts";
import { Site } from "neolace/core/Site.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

import { LookupExpression } from "../base.ts";
import { LookupValue, PropertyValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * prop(ID): get a property (properties are part of the schema; use get(prop=...)
 * to get properties from individual entries)
 */
export class PropFunction extends LookupFunctionOneArg {
    static functionName = "prop";

    /** An expression that specifies the VNID of the property we want */
    public get propIdExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const propId = (await this.propIdExpr.getValueAs(StringValue, context)).value;

        // This is the VNID of a property.
        // Viewing a single property whose VNID the user already knows does not require 'schema' permission;
        // the schema permission is only required to *list* all properties / entry types of a site.
        // This way, we can give the user permission to view an entry but not the schema, and that user can still
        // see property values of the entry that rely on expressions like `entry.get(prop=prop("VNID"))`
        const permissionsPredicate = await makeCypherCondition(context.subject, corePerm.viewSite.name, {}, [
            "property",
        ]);
        try {
            const data = await context.tx.queryOne(C`
                MATCH (property:${Property} {id: ${propId}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${context.siteId}})
                WHERE ${permissionsPredicate}
            `.RETURN({ "property.id": Field.VNID }));
            return new PropertyValue(data["property.id"]);
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new LookupEvaluationError("Property not found.");
            }
            throw err;
        }
    }
}
