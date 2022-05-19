import { SiteData } from "lib/api-client";
import React from "react";
import type { UISlotWidget } from "components/widgets/UISlot";

export type UiSlotId = "systemLinks" | `plugin:${string}`;

export type UiSlotChange = {op: "insert", widget: UISlotWidget<unknown>};

export interface EnabledPluginsConfig {
    plugins: {
        id: string,
        /** Settings for this plugin, for this specific site */
        siteSettings: Record<string, unknown>,
        uiSlotChanges: Record<UiSlotId, UiSlotChange[]>,
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

interface UiPluginsProviderProps {
    site: SiteData|undefined;
    children?: React.ReactNode | undefined;
}

export const UiPluginsProvider: React.FunctionComponent<UiPluginsProviderProps> = (props) => {
    const [plugins, setPlugins] = React.useState<EnabledPluginsConfig>({plugins: []});

    React.useMemo(async () => {
        const pluginsInSiteConfig = [{id: "search", settings: {}}];
        const result: EnabledPluginsConfig = {
            plugins: [],
        };
        const pluginLoaders = pluginsInSiteConfig.map(({id: pluginId, settings: siteSettings}) =>
            import(`../../plugins/${pluginId}/plugin-config`).then(
                (pluginConfig) => ({
                    pluginId,
                    siteSettings,
                    pluginConfig,
                })
            )
        );
        const loadedPlugins = await Promise.all(pluginLoaders);
        for (const p of loadedPlugins) {
            result.plugins.push({
                id: p.pluginId, 
                siteSettings: p.siteSettings,
                uiSlotChanges: p.pluginConfig["getUiSlotChanges"]?.(p.siteSettings) ?? [],
            });
        }
        setPlugins(result);
    }, [props.site?.frontendConfig]);

    return (
        <UiPluginsContext.Provider value={plugins}>
            {props.children}
        </UiPluginsContext.Provider>
    );
}
