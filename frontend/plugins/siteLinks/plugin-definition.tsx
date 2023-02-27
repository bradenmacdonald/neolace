import React from "react";
import { PluginDefinition } from "components/utils/ui-plugins";
import { UiChangeOperation } from "components/widgets/UISlot";
import { LeftPanelLinkSet } from "components/widgets/LeftPanelLinkSet";
import { defineMessage } from "components/utils/i18n";


/**
 * This is a simple plugin that adds site-specific custom links to the left-hand navigation panel.
 */
export const plugin: PluginDefinition = {
    id: "siteLinks",
    getUiSlotChanges(siteConfig) {

        const {label, links} = siteConfig as {label: string, links: {label: string, url: string}[]};

        return {
            "leftNavTop": [
                // Add CAMS-specific navigation links:
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "cams-site-nav",
                        content: (
                            <LeftPanelLinkSet
                                label={defineMessage({defaultMessage: "Navigation", id: "fBg+7V"})}
                                slotId="cams-nav"
                                links={
                                    links.map((link, idx) => ({
                                        id: `l${idx}`,
                                        priority: idx,
                                        content: {label: <>{link.label}</>, url: link.url},
                                    }))
                                }
                                hasIcons={false}
                            />
                        ),
                        priority: 11,
                    }
                },
            ],
        };
    },
};
