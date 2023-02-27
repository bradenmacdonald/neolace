/**
 * An image that is displayed as the result of the .image() lookup function.
 */
import React from "react";
import { Blurhash } from "react-blurhash";
import Image from "next/image";
import Link from "next/link";
import { ImageDisplayFormat } from "neolace-sdk";

import { SDK, useRefCache } from "lib/sdk";
import { imgThumbnailLoader } from "lib/config";
import { InlineMDT, MDTContext } from "../markdown-mdt/mdt";
import { RatioBox } from "./ratio-box";
import { LookupValue } from "./LookupValue";

/** Renders either an <a> or a <span> with the given class. */
const OptionalLink = (
    props: {
        children: React.ReactNode;
        href?: SDK.EntryValue | SDK.StringValue;
        className: string;
    },
) => {
    const refCache = useRefCache();
    if (props.href) {
        if (props.href.type === "Entry") {
            const entry: undefined|(NonNullable<SDK.EntryData["referenceCache"]>["entries"]["entryId"]) = refCache.entries[props.href.id];
            const url = "/entry/" + (entry?.key || props.href.id);
            return (
                <Link href={url} className={props.className}>
                    {props.children}
                </Link>
            );
        } else if (props.href.type === "String") {
            return (
                <Link href={props.href.value} className={props.className}>
                    {props.children}
                </Link>
            );
        }
    }
    return <span className={props.className}>{props.children}</span>;
};

interface ImageProps {
    value: SDK.ImageValue;
    /**
     * Set this to override the format=... part of value to force a "list item" format, which is more appropriate when
     * displaying a large number of images that fill up the whole page.
     */
    overrideFormat?: "ListItemFormat";
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Render a Lookup Value that is an image
 */
export const LookupImage: React.FunctionComponent<ImageProps> = (props) => {
    const refCache = useRefCache();
    const { value } = props;
    const ratio = value.width && value.height ? value.width / value.height : undefined;

    const imgEntryData = refCache.entries[value.entryId];
    const caption = (
        // If caption is an empty string, don't display anything:
        value.caption?.value === "" ? null :
        // Otherwise show the explicit caption set via .image(capation="..."):
        value.caption ? <LookupValue value={value.caption} mdtContext={props.mdtContext} /> :
        // If no explicit caption but the image has a description, use that as the caption:
        imgEntryData?.description ? <InlineMDT mdt={imgEntryData?.description ?? ""} context={props.mdtContext.childContextWith({entryId: value.entryId})} />
        // Otherwise, don't show a caption.
        : null
    );

    if (props.overrideFormat === "ListItemFormat") {
        // This mode works in conjunction with the "Page" mode in <LookupValue /> to display a list of images with
        // large thumbnails. It's used mostly for search results or when users click on the "See more" link to see
        // a list of images.
        return <>
            <li className="w-full md:max-w-[30%] border rounded border-gray-400 md:ml-4 mb-2 flex-initial bg-slate-50">
                <RatioBox ratio={16/9}>
                    <Link href={`/entry/${refCache.entries[value.entryId]?.key ?? value.entryId}`} className="relative left-0 top-0 w-full h-full block [&_canvas]:rounded-t">
                        {/* A blurry representation of the image, shown while it is loading. */}
                        <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" />
                        {/* the image: */}
                        <Image
                            src={value.imageUrl}
                            loader={imgThumbnailLoader}
                            alt={value.altText}
                            sizes={"768px" /* We're displaying these images never wider than ~760px, so use a smaller image source */}
                            fill
                            className={`rounded-t ${value.sizing === SDK.ImageSizingMode.Contain ? "object-contain" : "object-cover"}`}
                        />
                    </Link>
                </RatioBox>
                <div className="p-1 text-xs rounded-b border-t border-gray-400">
                    {caption ?? refCache.entries[value.entryId]?.name ?? ""}
                </div>
            </li>
        </>
    } else if (value.format === SDK.ImageDisplayFormat.PlainLogo) {
        return <div className="w-full mt-2 mb-1" style={{maxWidth: `${value.maxWidth ?? 400}px`}}>
            <OptionalLink href={value.link} className="">
                <Image
                    src={value.imageUrl}
                    loader={imgThumbnailLoader}
                    width={value.width}
                    height={value.height}
                    alt={value.altText}
                />
            </OptionalLink>
        </div>
    } else if (value.format === SDK.ImageDisplayFormat.RightAligned) {
        return <>
            <div className="md:clear-right"></div> {/* TODO: make this way of clearing text+images optional?, just have md:clear-right applied to the div below */}
            <div className="w-full md:w-1/3 lg:w-1/4 md:float-right border rounded border-gray-400 md:ml-4 mb-2">
                <RatioBox ratio={ratio}>
                    <OptionalLink href={value.link} className="relative left-0 top-0 w-full h-full block [&_canvas]:rounded-t">
                        {/* A blurry representation of the image, shown while it is loading. */}
                        <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" />
                        {/* the image: */}
                        <Image
                            src={value.imageUrl}
                            loader={imgThumbnailLoader}
                            alt={value.altText}
                            sizes={"250px" /* We're displaying these images never wider than 250px, so use a smaller image source */}
                            fill
                            className="object-contain rounded-t"
                        />
                    </OptionalLink>
                </RatioBox>
                {caption &&
                    <div className="p-1 text-sm bg-slate-50 rounded-b border-t border-gray-400">
                        {caption}
                    </div>
                }
            </div>
        </>
    } else if (value.format === ImageDisplayFormat.Normal) {
        // Normal - no border, centered on page, fit to width if wider than page:
        return <div className="p-2 flex items-center">
            <OptionalLink href={value.link} className="block mx-auto relative">
                {/* A blurry representation of the image, shown while it is loading. */}
                <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" className="opacity-30" />
                {/* the image: */}
                <Image
                    src={value.imageUrl}
                    loader={imgThumbnailLoader}
                    alt={value.altText}
                    width={value.width}
                    height={value.height}
                    className={`${value.sizing === SDK.ImageSizingMode.Contain ? "object-contain" : "object-cover"} mx-auto max-w-full`}
                    sizes={"1000px" /* Displaying at full width of the page, which is about 1000px */}
                />
            </OptionalLink>
        </div>;
    } else {
        // Thumbnail:
        return <OptionalLink href={value.link} className="inline-block h-20 w-20 border border-gray-500 rounded-md relative overflow-clip">
            {/* A blurry representation of the image, shown while it is loading. */}
            <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" className="opacity-30" />
            {/* the image: */}
            <Image
                src={value.imageUrl}
                loader={imgThumbnailLoader}
                alt={value.altText}
                fill
                className={`${value.sizing === SDK.ImageSizingMode.Contain ? "object-contain" : "object-cover"}`}
                sizes={"100px" /* We're displaying these small thumbnails at only < 100px wide, so use a small image */}
            />
        </OptionalLink>;
    }
};
