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
import { useRouter } from "next/router";

import type { AdminComponentProps } from "./site-admin";
import { useSiteData } from "lib/sdk";
import { Tab, TabBar } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import { AutoControl, Form } from "components/form-input/Form";
import { TextInput } from "components/form-input/TextInput";
import { MDTEditor } from "components/form-input/MDTEditor";

function rgbTripleToHex(value: [r: number, g: number, b: number]): string {
    return '#' + value.map(component => component.toString(16).padStart(2, "0")).join("");
}


/**
 * This site admin page shows the basic site settings
 * @param props
 * @returns
 */
export const SiteSettingsAdminTool: React.FunctionComponent<AdminComponentProps> = function (props) {
    const {site} = useSiteData();
    const router = useRouter();

    const activeTab = props.subPath[0] ?? "site";

    return (<>
        <TabBar activeTab={activeTab} onTabClick={(tabId) => router.push(tabId === "site" ? `/admin/settings` : `/admin/settings/${tabId}`)}>

            <Tab id="site" name={defineMessage({defaultMessage: "Site", id: "pYwSd7", })}>
                <Form>
                    {/* Site Name */}
                    <AutoControl
                        id="name"
                        value={site.name}
                        label={defineMessage({defaultMessage: 'Site Name', id: 'DQO/Q8'})}
                    >
                        <TextInput />
                    </AutoControl>

                    {/* Site Domain */}
                    <AutoControl
                        id="domain"
                        value={site.domain}
                        label={defineMessage({defaultMessage: 'Domain', id: 'oAFgOq'})}
                        hint={defineMessage({id: '5KeRYt', defaultMessage: "Contact us if you need to change the domain.", })}
                    >
                        <TextInput readOnly={true} disabled={true} />
                    </AutoControl>

                    {/* ID */}
                    <AutoControl
                        id="id"
                        value={site.key}
                        label={defineMessage({defaultMessage: "ID", id: "qlcuNQ"})}
                        hint={defineMessage({defaultMessage: "Cannot be changed.", id: "KIAjvA"})}
                    >
                        <TextInput readOnly={true} />
                    </AutoControl>

                    {/* Description */}
                    <AutoControl
                        id="id"
                        value={site.description}
                        label={defineMessage({defaultMessage: "Description", id: "Q8Qw5B"})}
                    >
                        <TextInput />
                    </AutoControl>

                    {/* Footer */}
                    <AutoControl
                        id="id"
                        value={site.footerContent}
                        label={defineMessage({defaultMessage: "Footer text", id: "rqv4zM"})}
                    >
                        <MDTEditor />
                    </AutoControl>
                </Form>
            </Tab>

            <Tab id="homepage" name={defineMessage({defaultMessage: "Home Page", id: "xHJnaY", })}>
                <p>Home page editor will be added in the near future.</p>
            </Tab>

            <Tab id="theme" name={defineMessage({defaultMessage: "Theme", id: 'Pe0ogR', })}>
                <p>Link color: <input type="color" value={rgbTripleToHex(site.frontendConfig.theme?.linkColor ?? [0, 0, 0])} readOnly={true} /></p>
                <p>Heading color: <input type="color" value={rgbTripleToHex(site.frontendConfig.theme?.headingColor ?? [0, 0, 0])} readOnly={true} /></p>
            </Tab>

            <Tab id="plugins" name={defineMessage({defaultMessage: "Plugins", id: 'QJAllU', })}>
                <p>Enabled frontend plugins:</p>
                <ul>
                    {Object.entries(site.frontendConfig.plugins??{}).map(([pluginId, pluginConfig]) =>
                        <li key={pluginId}>{pluginId} {Object.keys(pluginConfig).length > 0 ? <code>{JSON.stringify(pluginConfig)}</code> : null}</li>
                    )}
                </ul>
            </Tab>
        </TabBar>
    </>);
};
