/**
 * An image that is displayed as the result of the .image() lookup function.
 */
import React from 'react';
import { api } from 'lib/api-client';
import { Blurhash } from 'react-blurhash';
import Image from 'next/image';

import { MDTContext } from './markdown-mdt/mdt';
import { RatioBox } from './widgets/ratio-box';
import { MDT } from 'neolace-api';
 
const OptionalLink = (props: {children: React.ReactNode; href?: api.EntryValue|api.StringValue; mdtContext: MDTContext;}) => {
    if (props.href) {
        if (props.href.type === "Entry") {
            const entry: undefined|api.EntryData["referenceCache"]["entries"]["entryId"] = props.mdtContext.refCache.entries[props.href.id];
            const url = "/entry/" + (entry?.friendlyId || props.href.id);
            return <a href={url}>{props.children}</a>;
        } else if (props.href.type === "String") {
            return <a href={props.href.value}>{props.children}</a>;
        }
    }
    return <>{props.children}</>;
};

interface ImageProps {
    value: api.ImageValue;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Render a Lookup Value (computed/query value, such as all the "properties" shown on an entry's page)
 */
export const LookupImage: React.FunctionComponent<ImageProps> = (props) => {

    const {value} = props;
    const ratio = value.width && value.height ? value.width / value.height : undefined;
    if (value.format === api.ImageDisplayFormat.PlainLogo) {
        return <div className="w-full" style={{maxWidth: `${value.maxWidth ?? 400}px`}}>
            <OptionalLink href={value.link} mdtContext={props.mdtContext}>
                <Image
                    src={value.imageUrl}
                    width={value.width}
                    height={value.height}
                    alt={value.altText}
                    layout="intrinsic"
                />
            </OptionalLink>
        </div>
    } else if (value.format === api.ImageDisplayFormat.RightAligned) {
        return <div className="w-full md:w-1/3 lg:w-1/4 md:float-right border-2 border-gray-400 md:ml-4 mb-2 md:clear-right">
            <RatioBox ratio={ratio}>
                {/* A blurry representation of the image, shown while it is loading, and also forming the outer border */}
                <Blurhash hash={value.blurHash} width="100%" height="100%" />
                {/* the image: */}
                <OptionalLink href={value.link} mdtContext={props.mdtContext}>
                    <Image
                        src={value.imageUrl}
                        alt={value.altText}
                        layout="fill"
                        objectFit="contain"
                    />
                </OptionalLink>
            </RatioBox>
        </div>
    } else {
        // Thumbnail:
        return <div className="w-full md:w-1/3 lg:w-1/4 border-2 border-gray-400 md:ml-4 mb-2">
            <RatioBox ratio={ratio}>
                {/* A blurry representation of the image, shown while it is loading, and also forming the outer border */}
                <Blurhash hash={value.blurHash} width="100%" height="100%" />
                {/* the image: */}
                <Image
                    src={value.imageUrl}
                    alt={value.altText}
                    layout="fill"
                    objectFit="contain"
                />
            </RatioBox>
        </div>
    }
};
 