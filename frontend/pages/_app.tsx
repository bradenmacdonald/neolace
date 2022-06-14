import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { IntlProvider } from "react-intl";

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
    ru: dynamic<ProviderProps>(() =>
    import("../content/compiled-locales/ru.json").then((data) =>
            // eslint-disable-next-line react/display-name
            (props: ProviderProps) => <IntlProvider locale="ru" messages={data.default}>{props.children}</IntlProvider>
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

    return (
        <LoadIntlProvider>
            <AvailablePluginsProvider>
                <Component {...pageProps} />
            </AvailablePluginsProvider>
        </LoadIntlProvider>
    );
}
