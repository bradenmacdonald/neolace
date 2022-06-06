import { FormattedMessage } from "react-intl";
import type { PluginDefinition } from "components/utils/ui-plugins";

export const plugin: PluginDefinition = {
    id: "search",
    getUiSlotChanges(config) {
        return {
            "systemLinks": [
                {
                    op: "insert",
                    widget: {
                        id: "search",
                        priority: 20,
                        content: {
                            url: "/search",
                            label: <FormattedMessage id="xmcVZ0" defaultMessage="Search" />,
                            icon: "search",
                        },
                    },
                },
            ],
        };
    },

    getPageForPath(_site, path) {
        if (path === "/search") {
            return "search";
        }
        return undefined;
    },
};
