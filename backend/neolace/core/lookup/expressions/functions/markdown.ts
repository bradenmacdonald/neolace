import { InlineMarkdownStringValue, StringValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * markdown(str): indicates that the given string is markdown and should be rendered as markdown
 */
export class Markdown extends LookupFunctionOneArg {
    static functionName = "markdown";

    public async getValue(context: LookupContext) {
        const strValue = await this.firstArg.getValueAs(StringValue, context);
        return new InlineMarkdownStringValue(strValue.value);
    }
}
