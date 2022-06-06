import { api, SiteData } from "lib/api-client";
import React, { useContext } from "react";
import type { UISlotWidget } from "components/widgets/UISlot";

export type UiSlotId = "systemLinks" | `plugin:${string}`;

export type UiSlotChange = {op: "insert", widget: UISlotWidget<unknown>};

export interface PluginPageProps {
    path: string;
}

export interface PluginDefinition {
    id: string;
    getUiSlotChanges?: (siteConfig: Record<string, unknown>) => Partial<Record<UiSlotId, UiSlotChange[]>>;
    getPageForPath?: (site: api.SiteDetailsData, path: string) => string|undefined;
}

export interface EnabledPluginsConfig {
    plugins: {
        id: string,
        /** Settings for this plugin, for this specific site */
        siteConfig: Record<string, unknown>,
        uiSlotChanges: Partial<Record<UiSlotId, UiSlotChange[]>>,
    }[],
}

/**
 * The UiPluginsContext is used to provide <UISlot> elements with data about which plugins are enabled for the current
 * site.
 */
export const UiPluginsContext = React.createContext<EnabledPluginsConfig>({
    // Default values for this context:
    plugins: [],
});

export const AvailablePluginsContext = React.createContext<PluginDefinition[]>([]);

export const UiPluginsProvider = (props: {site: SiteData, children: React.ReactNode}) => {
    const allPlugins = useContext(AvailablePluginsContext);

    const enabledPlugins = React.useMemo(() => {
        const result: EnabledPluginsConfig = {plugins: []};
        for (const plugin of allPlugins) {
            const siteConfig = props.site.frontendConfig.plugins?.[plugin.id] as Record<string, unknown>|undefined;
            if (siteConfig !== undefined) {
                result.plugins.push({
                    id: plugin.id, 
                    siteConfig,
                    uiSlotChanges: plugin.getUiSlotChanges?.(siteConfig) ?? {},
                });
            }
        }
        return result;
    }, [allPlugins, props.site.frontendConfig.plugins]);

    return <UiPluginsContext.Provider value={enabledPlugins}>{props.children}</UiPluginsContext.Provider>;
};
