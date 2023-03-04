import { SDK, SiteData } from "lib/sdk";
import React, { useContext } from "react";
import type { UiSlotChange } from "components/widgets/UISlot";

export type UiSlotId =
    | "systemLinks"
    | "leftNavTop"
    | "leftNavBottom"
    | "globalHeader"
    | "siteLogo"
    | "preContent"
    /**
     * On the entry page, before the feature (article/image/files) of the entry.
     * This should be a React element that accepts an 'entry' parameter.
     */
    | "entryPreFeature"
    /**
     * On the enter page, after the entry content, but before the site footer.
     */
    | "entryAfterContent"
    | `plugin:${string}`;

export interface PluginPageProps {
    path: string;
}

export interface PluginDefinition {
    id: string;
    getUiSlotChanges?: (siteConfig: Record<string, unknown>) => Partial<Record<UiSlotId, UiSlotChange[]>>;
    getPageForPath?: (site: SDK.SiteDetailsData, path: string) => string | undefined;
    overrideLookupValue?: (
        siteConfig: Record<string, unknown>,
        value: SDK.StringValue,
    ) => React.ReactElement | undefined;
}

export interface EnabledPluginsConfig {
    plugins: {
        id: string;
        /** Settings for this plugin, for this specific site */
        siteConfig: Record<string, unknown>;
        uiSlotChanges: Partial<Record<UiSlotId, UiSlotChange[]>>;
        overrideLookupValue?: (
            siteConfig: Record<string, unknown>,
            value: SDK.StringValue,
        ) => React.ReactElement | undefined;
    }[];
    loaded: boolean;
}

/**
 * The UiPluginsContext is used to provide <UISlot> elements with data about which plugins are enabled for the current
 * site.
 */
export const UiPluginsContext = React.createContext<EnabledPluginsConfig>({
    // Default values for this context:
    plugins: [],
    loaded: false,
});

export const AvailablePluginsContext = React.createContext<PluginDefinition[]>([]);

export const UiPluginsProvider = (props: { site: SiteData; children: React.ReactNode }) => {
    const allPlugins = useContext(AvailablePluginsContext);

    const enabledPlugins = React.useMemo(() => {
        const result: EnabledPluginsConfig = { plugins: [], loaded: true };
        for (const plugin of allPlugins) {
            const siteConfig = props.site.frontendConfig.plugins?.[plugin.id] as Record<string, unknown> | undefined;
            if (siteConfig !== undefined) {
                result.plugins.push({
                    id: plugin.id,
                    siteConfig,
                    uiSlotChanges: plugin.getUiSlotChanges?.(siteConfig) ?? {},
                    overrideLookupValue: plugin.overrideLookupValue,
                });
            }
        }
        return result;
    }, [allPlugins, props.site.frontendConfig.plugins]);

    return <UiPluginsContext.Provider value={enabledPlugins}>{props.children}</UiPluginsContext.Provider>;
};
