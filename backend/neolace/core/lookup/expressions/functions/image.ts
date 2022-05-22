import { ImageDisplayFormat } from "neolace/deps/neolace-api.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryFeatureData } from "neolace/core/entry/features/get-feature-data.ts";

import { LookupExpression } from "../base.ts";
import {
    AnnotatedValue,
    EntryValue,
    ImageValue,
    InlineMarkdownStringValue,
    IntegerValue,
    LazyEntrySetValue,
    LazyIterableValue,
    NullValue,
    StringValue,
} from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LiteralExpression } from "../literal-expr.ts";

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
    // - "logo" to display the image at actual size, with no border
    // - "thumb" to display a thumbnail of the image(s) where a paragraph of text would go
    readonly formatExpr: LookupExpression;
    // Optional paramater - URL to link to. Only valid for "logo" format.
    readonly linkExpr?: LookupExpression;
    // Optional parameter - caption to display under the image
    readonly captionExpr?: LookupExpression;
    // Optional parameter - maximum width of the image.
    readonly maxWidthExpr?: LookupExpression;

    constructor(
        entriesExpr: LookupExpression,
        extraParams: {
            formatExpr?: LookupExpression;
            linkExpr?: LookupExpression;
            captionExpr?: LookupExpression;
            maxWidthExpr?: LookupExpression;
        },
    ) {
        super();
        this.entriesExpr = entriesExpr;
        this.formatExpr = extraParams.formatExpr ?? new LiteralExpression(new StringValue("thumb"));
        this.linkExpr = extraParams.linkExpr;
        this.captionExpr = extraParams.captionExpr;
        this.maxWidthExpr = extraParams.maxWidthExpr;
    }

    public async getValue(context: LookupContext): Promise<ImageValue | NullValue | LazyIterableValue> {
        const formatArgValue = await this.formatExpr.getValueAs(StringValue, context);
        const format: ImageDisplayFormat = (
            formatArgValue.value === "right"
                ? ImageDisplayFormat.RightAligned
                : formatArgValue.value === "logo"
                ? ImageDisplayFormat.PlainLogo
                : ImageDisplayFormat.Thumbnail
        );

        const entryToImageValue = async (entry: EntryValue) => {
            const imageData = await getEntryFeatureData(entry.id, { featureType: "Image", tx: context.tx });
            if (imageData === undefined) {
                return new NullValue();
            }

            const altText = (await context.tx.pullOne(Entry, (e) => e.name, { key: entry.id })).name;

            // Optional parameters:
            let caption = undefined;
            if (this.captionExpr) {
                caption = await this.captionExpr.getValueAsOneOf([InlineMarkdownStringValue, StringValue], context);
            }
            let link: EntryValue | StringValue = entry;
            if (format === ImageDisplayFormat.PlainLogo && this.linkExpr) {
                link = await this.linkExpr.getValueAsOneOf([EntryValue, StringValue], context);
            }
            let maxWidth = undefined;
            if (this.maxWidthExpr) {
                maxWidth = Number((await this.maxWidthExpr.getValueAs(IntegerValue, context)).value);
            }
            // Tell TypeScript that the border color is a 4-tuple, not just number[]
            const borderColor = imageData.borderColor as [number, number, number, number] | undefined;

            return new ImageValue({
                ...imageData,
                borderColor,
                format,
                entryId: entry.id,
                altText,
                caption,
                link,
                maxWidth,
            });
        };

        const singleEntry = await (await this.entriesExpr.getValue(context)).castTo(EntryValue, context);
        if (singleEntry) {
            // This is a single entry, which we'll return as an image:
            return await entryToImageValue(singleEntry);
        } else {
            // Were we given a set of entries?
            const entrySet = await this.entriesExpr.getValueAs(LazyEntrySetValue, context);
            if (entrySet) {
                return new LazyIterableValue({
                    context,
                    getCount: () => entrySet.getCount(),
                    getSlice: async (offset, numItems) => {
                        const entries = await entrySet.getSlice(offset, numItems);
                        return Promise.all(
                            entries.map((entry) =>
                                entryToImageValue(entry instanceof AnnotatedValue ? entry.value as EntryValue : entry)
                            ),
                        );
                    },
                    sourceExpression: this.entriesExpr,
                    sourceExpressionEntryId: context.entryId,
                });
            } else {
                throw new LookupEvaluationError(
                    `The expression "${this.entriesExpr.toDebugString()}" cannot be used with image().`,
                );
            }
        }
    }

    public toString(): string {
        return `image(${this.entriesExpr.toString()}, format=${this.formatExpr.toString()})`;
    }
}
