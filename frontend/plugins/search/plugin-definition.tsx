import { FormattedMessage } from "react-intl";
import type { PluginDefinition } from "components/utils/ui-plugins";
import { UiChangeOperation } from "components/widgets/UISlot";

export const plugin: PluginDefinition = {
    id: "search",
    getUiSlotChanges(config) {
        return {
            "systemLinks": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "search",
                        priority: 20,
                        content: {
                            url: "/search",
                            label: <FormattedMessage id="JrRTUH" defaultMessage="Quick Search" />,
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
