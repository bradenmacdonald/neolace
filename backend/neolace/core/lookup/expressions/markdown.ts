import { LookupExpression } from "../expression.ts";
import { InlineMarkdownStringValue, StringValue } from "../values.ts";
import { LookupContext } from "../context.ts";

/**
 * markdown(str): indicates that the given string is markdown and should be rendered as markdown
 */
export class Markdown extends LookupExpression {
    // An expression that specifies the string value of the markdown
    readonly argument: LookupExpression;

    constructor(argument: LookupExpression) {
        super();
        this.argument = argument;
    }

    public async getValue(context: LookupContext) {
        const strValue = await this.argument.getValueAs(StringValue, context);
        return new InlineMarkdownStringValue(strValue.value);
    }

    public toString(): string {
        return `markdown(${this.argument.toString()})`;
    }
}
