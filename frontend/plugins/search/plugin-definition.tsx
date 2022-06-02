import { FormattedMessage } from "react-intl";
import type { UiSlotChange, UiSlotId } from "components/utils/ui-plugins";

export function getUiSlotChanges(config: Record<string, unknown>): Record<UiSlotId, UiSlotChange[]> {
    return {
        "systemLinks": [
            {op: "insert", widget: {
                id: "search",
                priority: 20,
                content: {
                    url: "/search",
                    label: <FormattedMessage id="xmcVZ0" defaultMessage="Search" />,
                    icon: "search"
                },
            }}
        ],
    };
}
