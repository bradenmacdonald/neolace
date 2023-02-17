import { LookupExpression } from "../base.ts";
import { AnnotatedValue, StringValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * lookupDemo([expression])
 *
 * Render an interactive demo of the given lookup expression, showing the expression, the result, and the ability for
 * the user to edit it and see the new result.
 */
export class LookupDemo extends LookupFunctionOneArg {
    static functionName = "lookupDemo";

    /** This is the expression that we're going to show */
    public get expr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<AnnotatedValue> {
        const value = await this.expr.getValue(context);
        // We can't return annotations on a lazy value, so make sure this is a concrete value:
        const concreteValue = await value.makeConcrete();

        return new AnnotatedValue(concreteValue, {
            displayAsEditableDemoFromExpression: new StringValue(this.expr.toString()),
        });
    }
}
