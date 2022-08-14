import React from "react";
import Script from "next/script"
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

export const plugin: PluginDefinition = {
    id: "commento",
    getUiSlotChanges() {
        return {
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
                                <div id="commento" dangerouslySetInnerHTML={{__html: ""}} />
                                <Script defer src="https://cdn.commento.io/js/commento.js"/>
                            </OnlyOnClient>
                        </>,
                    },
                },
            ],
        };
    },
};
