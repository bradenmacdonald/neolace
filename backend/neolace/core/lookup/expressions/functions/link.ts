import { EntryValue, FileValue, ImageValue, InlineMarkdownStringValue, StringValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { LookupExpression } from "../base.ts";
import { MDT } from "neolace/deps/neolace-sdk.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

/**
 * link(object or URL, text=""): Create a link to the given entry/Image/File/URL, optionally with the specified text.
 */
export class Link extends LookupFunctionWithArgs {
    static functionName = "link";

    /** Optional paramater - maximum width of the image */
    public get textExpr(): LookupExpression | undefined {
        return this.otherArgs["text"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["text"] });
    }

    public async getValue(context: LookupContext) {
        const hrefValue = await this.firstArg.getValueAsOneOf(
            [EntryValue, ImageValue, FileValue, StringValue],
            context,
        );

        let defaultTextString: string, url: string;

        if (hrefValue instanceof EntryValue) {
            const data = await context.tx.pullOne(Entry, (e) => e.name.key, { id: hrefValue.id });
            url = `/entry/${data.key}`;
            defaultTextString = data.name;
        } else if (hrefValue instanceof ImageValue) {
            const entryData = await context.tx.pullOne(Entry, (e) => e.name, { id: hrefValue.data.entryId });
            url = hrefValue.data.imageUrl;
            defaultTextString = entryData.name;
        } else if (hrefValue instanceof FileValue) {
            url = hrefValue.url;
            defaultTextString = hrefValue.filename;
        } else {
            url = hrefValue.value; // a string URL
            defaultTextString = hrefValue.value; // by default the URL itself is the text of the link; we have nothing else to use.
        }

        let markdownTextValue: string;
        if (this.textExpr) {
            // The user has provided a text label to use for the link. It may be either plain text or markdown:
            const textVal = await this.textExpr.getValueAsOneOf([StringValue, InlineMarkdownStringValue], context);
            if (textVal instanceof InlineMarkdownStringValue) {
                markdownTextValue = textVal.value;
            } else {
                markdownTextValue = MDT.escapeText(textVal.value);
            }
        } else {
            markdownTextValue = MDT.escapeText(defaultTextString);
        }

        return new InlineMarkdownStringValue(`[${markdownTextValue}](${url})`);
    }
}
