import type { PluginDefinition } from "components/utils/ui-plugins";
import { UiChangeOperation } from "components/widgets/UISlot";
import { QuickSearchBox } from "./components/QuickSearchBox";

export const plugin: PluginDefinition = {
    id: "search",
    getUiSlotChanges(config) {
        return {
            // Add the search quick box below the site logo:
            "leftNavTop": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "search-box",
                        priority: 2,
                        content: <>
                            <QuickSearchBox/>
                        </>,
                    }
                }
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
