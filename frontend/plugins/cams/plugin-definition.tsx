import type { PluginDefinition } from "components/utils/ui-plugins"
import { UiChangeOperation } from "components/widgets/UISlot";

export const plugin: PluginDefinition = {
    id: "cams",
    getPageForPath(_site, path) {
        if (path === "/members-only") {
            return "members-only";
        }
        return undefined;
    },
    getUiSlotChanges() {
        return {
            "leftNavBottom": [
                {
                    op: UiChangeOperation.Hide,
                    widgetId: "systemLinks",
                },
            ],
        };
    },
};
