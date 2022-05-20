import { SiteData } from "lib/api-client";
import React, { useContext } from "react";
import type { UISlotWidget } from "components/widgets/UISlot";
import dynamic from "next/dynamic";
import { IN_BROWSER } from "lib/config";

export type UiSlotId = "systemLinks" | `plugin:${string}`;

export type UiSlotChange = {op: "insert", widget: UISlotWidget<unknown>};

export interface PluginDefinition {
    id: string;
    getUiSlotChanges?: (siteConfig: Record<string, unknown>) => Partial<Record<UiSlotId, UiSlotChange[]>>;
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

const AvailablePluginsContext = React.createContext<PluginDefinition[]>([]);

async function loadAllPlugins(): Promise<React.FunctionComponent<{children: React.ReactNode}>> {
    const allPlugins = ["search"]
    const pluginLoaders = allPlugins.map((pluginId) =>
        import(`../../plugins/${pluginId}/plugin-definition`).then(
            (pluginDefinition: PluginDefinition) => ({
                pluginId,
                pluginDefinition,
            })
        )
    );
    const loadedPlugins = await Promise.all(pluginLoaders);
    const result: PluginDefinition[] = [];
    for (const {pluginId, pluginDefinition} of loadedPlugins) {
        result.push({
            ...pluginDefinition,
            id: pluginId,
        });
    }

    if (!IN_BROWSER) {
        console.debug(`Loaded ${result.length} frontend plugins, available for server-side rendering.`);
    }

    return ((props: {children: React.ReactNode}) => 
        <AvailablePluginsContext.Provider value={result}>{props.children}</AvailablePluginsContext.Provider>
    );
}

export const AllPluginsProvider = dynamic(() => loadAllPlugins());

export const UiPluginsProvider = (props: {site: SiteData, children: React.ReactNode}) => {
    const allPlugins = useContext(AvailablePluginsContext);

    const enabledPlugins = React.useMemo(() => {
        const result: EnabledPluginsConfig = {plugins: []};
        for (const plugin of allPlugins) {
            // TODO: check if this plugin is enabled on this site.
            const siteConfig = {name: props.site.name};
            result.plugins.push({
                id: plugin.id, 
                siteConfig,
                uiSlotChanges: plugin.getUiSlotChanges?.(siteConfig) ?? {},
            });
        }
        return result;
    }, [allPlugins, props.site.name, props.site.frontendConfig]);

    return <UiPluginsContext.Provider value={enabledPlugins}>{props.children}</UiPluginsContext.Provider>;
};
