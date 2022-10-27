import React from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import { PluginDefinition } from "components/utils/ui-plugins";
import { UiChangeOperation } from "components/widgets/UISlot";

/**
 * If we just try to use the Commento widget directly, React will complain about hydration errors
 * when the Commento script changes the server-built DOM pre-hydration and then it gets hydrated.
 * The solution is to only load Commento in the browser, after initial hydration, using this component.
 */
const OnlyOnClient: React.FunctionComponent<{children: React.ReactNode}> = (props) => {
    const [hasinitialized, setInitialized] = React.useState(false);
    React.useEffect(() => setInitialized(true), []);
    return hasinitialized ? <>{props.children}</> : null;
}

/** The Commento.io widget won't normally reload properly on a soft navigation event. This may fix it. */
const CommentoReloader: React.FunctionComponent<{children?: never}> = () => {
    const router = useRouter();
    React.useEffect(() => {
        // Commento doesn't have good handling of single page applications. This is hack to force it to re-init when
        // the page location changes. However, on the initial page load, Commento's JS may not be ready yet, so we
        // also have to use data-auto-init=true to tell Commento to try to init when its JS is first loaded.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).commento?.main?.();
    }, [router.pathname]);
    return null;
};

export const plugin: PluginDefinition = {
    id: "commento",
    getUiSlotChanges() {
        return {
            "globalHeader": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "commento-discussion-script",
                        priority: 10,
                        content: (<>
                            <Script id="commento-var">{`window.commento = window.commento ?? {};`}</Script>
                            <Script defer src="https://cdn.commento.io/js/commento.js" data-auto-init="true" data-id-root="commento-entry-discussion" />
                        </>),
                    },
                },
            ],
            "entryAfterContent": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "entry-discussion-commento",
                        priority: 10,
                        content: <>
                            <h2>Comments</h2>
                            <OnlyOnClient>
                                {/* We use dangerouslySetInnerHTML to tell React not to modify the contents of this DIV,
                                    as the Commento plugin will be managing it, not React. */}
                                <div id="commento-entry-discussion" dangerouslySetInnerHTML={{__html: ""}} />
                                <CommentoReloader />
                            </OnlyOnClient>
                        </>,
                    },
                },
            ],
        };
    },
};
