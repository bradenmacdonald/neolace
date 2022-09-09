import React from "react";

import type { AdminComponentProps } from "./site-admin";
import { useSiteData } from "lib/api-client";
import { useUser } from "lib/authentication";
import { Tab, TabBar } from "components/widgets/Tabs";
import { defineMessage } from "components/utils/i18n";
import { useRouter } from "next/router";
import { AutoControl, Form } from "components/widgets/Form";
import { TextInput } from "components/widgets/TextInput";
import { MDTEditor } from "components/widgets/MDTEditor";

function rgbTripleToHex(value: [r: number, g: number, b: number]): string {
    return '#' + value.map(component => component.toString(16).padStart(2, "0")).join("");
}


/**
 * This site admin page shows the basic site settings
 * @param props
 * @returns
 */
export const SiteSettingsAdminTool: React.FunctionComponent<AdminComponentProps> = function (props) {
    const user = useUser();
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
                        value={site.shortId}
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
                        value={site.footerMD}
                        label={defineMessage({defaultMessage: "Footer text", id: "rqv4zM"})}
                    >
                        <MDTEditor />
                    </AutoControl>
                </Form>
            </Tab>

            <Tab id="homepage" name={defineMessage({defaultMessage: "Home Page", id: "xHJnaY", })}>
                <p>Home page editor will be added in the near future.</p>
            </Tab>

            <Tab id="links" name={defineMessage({defaultMessage: "Links", id: 'qCcwo3', })}>
                <p>Main site links (on the left-hand side):</p>
                <ol>
                    {site.frontendConfig.headerLinks?.map((l, lIdx) => 
                        <li key={lIdx}><strong>{l.text}</strong> : {l.href}</li>
                    )}
                </ol>
            </Tab>

            <Tab id="theme" name={defineMessage({defaultMessage: "Theme", id: 'Pe0ogR', })}>
                <p>Link color: <input type="color" value={rgbTripleToHex(site.frontendConfig.theme?.linkColor ?? [0, 0, 0])} readOnly={true} /></p>
                <p>Heading color: <input type="color" value={rgbTripleToHex(site.frontendConfig.theme?.headingColor ?? [0, 0, 0])} readOnly={true} /></p>
            </Tab>
        </TabBar>
    </>);
};