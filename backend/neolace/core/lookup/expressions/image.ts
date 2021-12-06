import { getEntryFeatureData } from "neolace/core/entry/features/get-feature-data.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import {
    LazyEntrySetValue,
    NullValue,
    StringValue,
    EntryValue,
    ImageValue,
    InlineMarkdownStringValue,
} from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";
import { LiteralExpression } from "./literal-expr.ts";


/**
 * image([entry or entry set], [align])
 *
 * Given an entry, if it is an image entry (its entry type has the "image" feature enabled) or it has a hero image (its
 * entry type has the "hero image" feature enabled), display it as an image.
 */
export class Image extends LookupExpression {

    // An expression that specifies what entry/entries image[s] we want to display
    readonly entriesExpr: LookupExpression;
    // The format mode:
    // - "right" to float a thumbnail of the image to the right.
    // - "thumb" to display a thumbnail of the image(s) where a paragraph of text would go
    readonly formatExpr: LookupExpression;

    constructor(entriesExpr: LookupExpression, extraParams: {formatExpr?: LookupExpression}) {
        super();
        this.entriesExpr = entriesExpr;
        this.formatExpr = extraParams.formatExpr ?? new LiteralExpression(new StringValue("thumb"));
    }

    public async getValue(context: LookupContext) {
        let format: "thumb"|"right" = "thumb";
        const formatArgValue = await this.formatExpr.getValueAs(context, StringValue);
        if (formatArgValue.value === "right") {
            format = "right";
        }
        let entry = (await this.entriesExpr.getValue(context)).castTo(EntryValue, context);
        if (entry === undefined) {
            // We were given an entry set, not an entry - so just take the first one:
            const entrySet = await this.entriesExpr.getValueAs(context, LazyEntrySetValue);
            const slice = await entrySet.getSlice(0n, 1n);  // Get the first value from the set
            if (slice.length === 0) {
                return new NullValue();
            }
            entry = slice[0].castTo(EntryValue, context);
        }
        if (entry === undefined) {
            throw new LookupEvaluationError(`The expression "${this.entriesExpr.toDebugString()}" cannot be used with image().`);
        }
        const imgDescription = (await context.tx.pullOne(Entry, e => e.description, {key: entry.id})).description;
        const caption = new InlineMarkdownStringValue(imgDescription);
        const imageData = await getEntryFeatureData(entry.id, {featureType: "Image", tx: context.tx});
        if (imageData === undefined) {
            return new NullValue();
        }
        return new ImageValue({...imageData, format, entryId: entry.id, caption});
    }

    public toString(): string {
        return `image(${this.entriesExpr.toString()}, format=${this.formatExpr.toString()})`;
    }
}
