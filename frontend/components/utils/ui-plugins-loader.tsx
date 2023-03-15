/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";

import { AvailablePluginsContext, PluginDefinition } from "./ui-plugins";

import * as plugins from "../../plugins/enabled-plugins";

/** To provide all the available plugins to client-side and server-site code. */
export const installedPlugins: PluginDefinition[] = Object.values(plugins);

/**
 * To provide all the available plugins to React, on client side and server site.
 * 
 * Our current plugin architecture loads *all* installed plugins at build time, but just the 'plugin-definition.tsx'
 * file for each plugin, which consequently should be kept as small as possible and use as few imports as possible.
 * 
 * Plugins should use dynamic imports (next/dynamic) to load additional code as needed, when they are actually in use.
 *
 * In future, we could consider changing this to a model where all plugins are loaded dynamically depending on which
 * site is in use, but that currently seems unnecessary.
 */
export const AvailablePluginsProvider =
    ((props: { children: React.ReactNode }) => (
        <AvailablePluginsContext.Provider value={installedPlugins}>{props.children}</AvailablePluginsContext.Provider>
    ));
