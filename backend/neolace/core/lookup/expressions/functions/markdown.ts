/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
