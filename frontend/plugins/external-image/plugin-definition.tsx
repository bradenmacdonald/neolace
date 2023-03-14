/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import React from "react";
import { PluginDefinition } from "components/utils/ui-plugins";


export const plugin: PluginDefinition = {
    id: "external-image",
    renderLookupPluginValue(_siteConfig, value) {
        const {url, alt} = value.value as {url: string, alt: string};
        // eslint-disable-next-line @next/next/no-img-element
        return <img alt={alt} src={url} />
    },
};
