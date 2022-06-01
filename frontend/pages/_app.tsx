import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { IntlProvider } from "react-intl";

import { UserProvider } from "components/user/UserContext";
// Import global CSS (Tailwind-based)
import "../global-styles.css";

type ProviderProps = { children: React.ReactNode };
// DynamicIntlProviders: Helper to dynamically load i18n messages for react-intl
// For English:
// -> We're not using a babelTransform to remove 'defaultMessage' values from our JSX files, so we don't actually need
//    to load a separate file for English. We just immediately initiatlize an IntlProvider with no message data.
// -> Alternately, we could use the babel transform and load English translations from
//    "../content/compiled-locales/en.json" either always included in the bundle in every case (not dynamically) or
//    loaded dynamically only when English is active.
// For other languages:
// -> We use next/dynamic to load only the data for the active language, delaying the rendering of the React tree until
//    it is loaded (otherwise if you render while it's still loading, react-intl throws errors about missing
//    translations).
const DynamicIntlProviders = {
    en: (props: ProviderProps) => <IntlProvider locale="en" messages={{}}>{props.children}</IntlProvider>,
    fr: dynamic<ProviderProps>(() =>
        import("../content/compiled-locales/fr.json").then((data) =>
            // eslint-disable-next-line react/display-name
            (props: ProviderProps) => <IntlProvider locale="fr" messages={data.default}>{props.children}</IntlProvider>
        )
    ),
};

export const AvailablePluginsProvider = dynamic<{children: React.ReactNode}>(
    import('components/utils/ui-plugins-loader').then((mod) => mod.AvailablePluginsProvider)
);

export default function NeolaceApp({ Component, pageProps }: AppProps) {
    const { locale, events: routerEvents } = useRouter();
    // Dynamically load the IntlProvider for the currently active language:
    const LoadIntlProvider = DynamicIntlProviders[locale as keyof typeof DynamicIntlProviders] ??
        DynamicIntlProviders.en;

    // Fix scrolling: when Next.js does a client-side page load, it scrolls the root element, but our root element doesn't scroll.
    // We need to scroll a different element so that the page scrolls back to top when a link is clicked.
    React.useEffect(() => {
        // TODO: fix this by making it so that the root 'window' element scrolls, not this child .scroll-root.
        // Then we can remove this custom code and rely on Next.js's default support, which will work better because
        // it preserves the scroll position when you go back. This currently resets the scroll on back.
        routerEvents.on("routeChangeComplete", () => {
            document.querySelector(".scroll-root")?.scroll({ top: 0, left: 0, behavior: "auto" });
        });
    });

    return (
        <UserProvider>
            <LoadIntlProvider>
                <AvailablePluginsProvider>
                    <Component {...pageProps} />
                </AvailablePluginsProvider>
            </LoadIntlProvider>
        </UserProvider>
    );
}
