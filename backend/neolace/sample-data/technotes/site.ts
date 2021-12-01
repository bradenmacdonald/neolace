/**
 * Home page text and other data for the TechNotes sample content
 */
import { dedent } from "neolace/lib/dedent.ts";
import { UpdateSite } from "neolace/core/Site.ts";
import { ids } from "./content.ts";

export const siteData: Partial<Parameters<typeof UpdateSite>[0]> = {
    homePageMD: dedent`
        # Welcome to TechNotes

        TechNotes is an open engineering library focused on clean tech - specifically electric vehicle (EV) battery
        technology. Our goal is to combine data, reference articles, design examples, datasets, patents, technical
        drawings, and discussion forums together in one integrated resource that's exceptionally easy to use and
        well-organized.

        ## Featured Content

        We are currently working to develop our platform and populate example content. For now, you can check out
        [**"18650 cell"**](/entry/${ids.cell18650}) or [**"AA battery"**](/entry/${ids.batteryAA}).
    `,
    footerMD: dedent`
        **Legal notice**: The content on this site is provided with no warranty, express or implied. **Do not rely on this content for any important purpose without verifying it independently**.

        **License**: Text content (articles and descriptions) is available under the terms of the [Creative Commons Attribution-ShareAlike 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/). Properties and their values are public domain. Images and other media files are available under various licenses - refer to each item's page for details.

        **Cookies**: We do not use cookies or other tracking systems unless you log in, in which case a strictly necessary cookie is used to keep you logged in. We do not use third-party cookies.

        **Platform**: Powered by [Neolace](https://www.neolace.com/).
    `,
};
