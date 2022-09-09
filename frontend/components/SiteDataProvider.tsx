import { SiteData, useSiteData } from "lib/api";
import { SWRConfig } from "swr";
import { UiPluginsProvider } from "./utils/ui-plugins";

interface SiteDataProviderProps {
    /**
     * For a better user experience with no flash of unstyled content etc, use getStaticProps to preload the site data
     * and pass it in here.
     *
     * TODO: Ideally the logic to load the data in getStaticProps shouldn't need to be duplicated in each separate page.
     * Follow https://github.com/vercel/next.js/discussions/10949 and https://nextjs.org/blog/layouts-rfc
     * for updates on a better way to handle this.
     */
    sitePreloaded: SiteData | null;
    children: React.ReactNode;
}

/**
 * Provide all React components within this one with data about the current site (and its enabled plugins)
 *
 * See https://swr.vercel.app/docs/with-nextjs for details of how this works using SWR's global fallback config.
 */
export const SiteDataProvider: React.FunctionComponent<SiteDataProviderProps> = (props) => {
    const { site, siteError } = useSiteData(props.sitePreloaded ? { fallback: props.sitePreloaded } : {});
    const fallback = props.sitePreloaded ? { [`site:${props.sitePreloaded.domain}`]: props.sitePreloaded } : {};

    return (
        <SWRConfig value={{ fallback }}>
            <UiPluginsProvider site={site}>
                {props.children}
            </UiPluginsProvider>
        </SWRConfig>
    );
};
