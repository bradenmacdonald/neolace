/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import type * as api from "neolace/deps/neolace-sdk.ts";
import { ConcreteValue } from "./base.ts";
import { EntryValue } from "./EntryValue.ts";
import { StringValue } from "./StringValue.ts";
import { InlineMarkdownStringValue } from "./InlineMarkdownStringValue.ts";

interface ImageData {
    entryId: VNID;
    altText: string;
    imageUrl: string;
    contentType: string;
    size: number;
    width?: number;
    height?: number;
    blurHash?: string;
    borderColor?: [R: number, G: number, B: number, A: number];
    // Should this image be a link?
    link?: EntryValue | StringValue;
    // How the image should be displayed:
    format: api.ImageDisplayFormat;
    caption?: InlineMarkdownStringValue | StringValue;
    maxWidth?: number;
    sizing: api.ImageSizingMode;
}

/**
 * An image
 */
export class ImageValue extends ConcreteValue {
    public readonly data: ImageData;

    constructor(data: ImageData) {
        super();
        this.data = data;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for an image
    }

    protected serialize(): api.ImageValue {
        return {
            type: "Image",
            entryId: this.data.entryId,
            altText: this.data.altText,
            caption: this.data.caption?.toJSON() as api.InlineMarkdownString | api.StringValue | undefined,
            imageUrl: this.data.imageUrl,
            contentType: this.data.contentType,
            size: this.data.size,
            width: this.data.width,
            height: this.data.height,
            blurHash: this.data.blurHash,
            borderColor: this.data.borderColor,
            format: this.data.format,
            link: this.data.link?.toJSON() as api.StringValue | api.EntryValue | undefined,
            maxWidth: this.data.maxWidth,
            sizing: this.data.sizing,
        };
    }
}
