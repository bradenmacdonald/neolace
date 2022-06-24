/**
 * Neolace Documentation Site
 */
import { dedent } from "neolace/lib/dedent.ts";
import type { UpdateSite } from "neolace/core/Site.ts";

export const siteData: Partial<Parameters<typeof UpdateSite>[0]> = {
    homePageMD: dedent`
        # Neolace Documentation

        We are currently developing the documentation for Neolace. We will be adding to this site regularly over the
        coming weeks.

        ## Guides

        Coming soon.

        ## Tutorials

        Coming soon.

        ## Explanations

        These in-depth articles will help you understand how Neolace works, and _why_ it has been designed the way it
        has. These are aimed at developers, site administrators, and power users.

        Currently available explanations:

        { allEntries().filter(entryType=[[/etype/_7TZIMnSQGqTSn1g1Y7jANc]]) }

        ## Reference

        ### Terminology

        { allEntries().filter(entryType=[[/etype/_5oX5jvGNB6hQzuu08iQs5b]]) }
    `,
    footerMD: dedent`
        © Copyright 2022 MacDonald Thoughtstuff Inc.
        All documentation text and multimedia on this site are licensed under the [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/).
    `,
    frontendConfig: {
        headerLinks: [
            {text: "Documentation Home", href: "/"},
        ],
        redirects: {},
        integrations: {},
        theme: {
            headingColor: [15, 23, 42],
            linkColor: [21, 94, 117],
        },
        plugins: {
            search: {},
        },
        features: {
            hoverPreview: {enabled: true},
        },
    },
    accessMode: "pubcont",
    publicGrantStrings: [],
};
