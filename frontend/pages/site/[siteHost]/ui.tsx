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
import { NextPage } from "next";

import { SitePage } from "components/SitePage";
import FourOhFour from "pages/404";
import { _allIcons, Icon, IconId } from "components/widgets/Icon";
import { Button, ToolbarButton, ToolbarSeparator } from "components/widgets/Button";
import { Spinner } from "components/widgets/Spinner";
import { Tooltip } from "components/widgets/Tooltip";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { SuccessMessage } from "components/widgets/SuccessMessage";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";
import { AutoControl, Control, Form } from "components/form-input/Form";
import { defineMessage, noTranslationNeeded } from "components/utils/i18n";
import { Tab, TabBarRouter } from "components/widgets/Tabs";
import { LookupValue } from "components/widgets/LookupValue";
import { SDK, RefCacheContext } from "lib/sdk";
import { MDTContext } from "components/markdown-mdt/mdt";
import { DEVELOPMENT_MODE } from "lib/config";
import { Frame, FrameBody, FrameHeader } from "components/widgets/Frame";
import { TextInput } from "components/form-input/TextInput";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { MDTEditor } from "components/form-input/MDTEditor";
import { SelectBox } from "components/form-input/SelectBox";

const UIDemo = (props: { label: string; children: React.ReactNode }) => {
    return (
        <tr>
            <th className="pb-4 align-top pr-4 text-left">{props.label}</th>
            <td className="pb-4 align-top">{props.children}</td>
        </tr>
    );
};

const UiDemoPage: NextPage = function (props) {
    const [selectedIcon, setSelectedIcon] = React.useState<IconId>("search");
    const [searchDemoText, setSearchDemoText] = React.useState("");
    const [lookupDemoText, setLookupDemoText] = React.useState("");
    const [mdtDemoText, setMDTDemoText] = React.useState("This has **bold**, *italic*, and a { lookup expression }.");
    const [selectBoxItem, setSelectBoxItem] = React.useState("");
    const [selectBox2Item, setSelectBox2Item] = React.useState("");

    if (!DEVELOPMENT_MODE) {
        return <FourOhFour />;
    }

    const demoMDTContext = new MDTContext({});
    const demoRefCache: SDK.ReferenceCacheData = {
        entries: {
            "_12345": {
                id: SDK.VNID("_12345"),
                description: "Description of the entry goes here.",
                entryType: { key: "demo-type" },
                key: "demo-entry",
                name: "Demo Entry",
            },
        },
        entryTypes: {
            "demo-type": {
                key: "demo-type",
                name: "Type goes here",
                abbreviation: "D",
                color: SDK.EntryTypeColor.Cyan,
            },
        },
        properties: {
            "demo-prop": {
                name: "Demoness",
                description: "To what extent this is a demo.",
                key: "demo-prop",
                type: SDK.PropertyType.Value,
                standardURL: "",
                rank: 1,
                displayAs: "",
            }
        },
        lookups: [],
    };

    return (
        <RefCacheContext.Provider value={{refCache: demoRefCache}}>
        <SitePage title="UI Demos">
            <h1 className="text-3xl font-semibold">UI Demos</h1>

            <p>This page (for development only) provides a demo of the various Neolace UI components.</p>

            <h2>Form</h2>

            <p>Here is an example of our form component.</p>

            <Form>
                <Control id="form-email" label={defineMessage({ id: "SqR1My", defaultMessage: "Your Email" })}>
                    <TextInput />
                </Control>
                <Control
                    id="form-lookup-expr"
                    label={defineMessage({ id: "UkgQ/N", defaultMessage: "Lookup Expression" })}
                    hint={defineMessage({
                        id: "S02xzc",
                        defaultMessage:
                            "Try using SHIFT-ENTER to create multiple lines, or entering a long string to see the box expand.",
                    })}
                >
                    <LookupExpressionInput
                        value={lookupDemoText}
                        onChange={setLookupDemoText}
                        placeholder={defineMessage({ defaultMessage: "Enter a lookup expression", id: "18J4sF" })}
                    />
                </Control>
                <AutoControl
                    id="form-mdt-editor"
                    label={defineMessage({ id: "2clcRr", defaultMessage: "MDT (Markdown / rich text) editor" })}
                    hint={defineMessage({
                        id: "XR+5Ez",
                        defaultMessage: "This also shows our <ToolbarButton/> component used to make a toolbar.",
                    })}
                    onChangeFinished={setMDTDemoText}
                    value={mdtDemoText}
                >
                    <MDTEditor inlineOnly={true} />
                </AutoControl>
            </Form>

            <h2>Icons</h2>

            <div className="flex flex-wrap">
                {_allIcons.map((id) => (
                    <div
                        key={id}
                        className="inline-block w-32 h-32 border rounded m-2 text-center text-4xl pt-6 hover:border-theme-link-color"
                        onClick={() => setSelectedIcon(id)}
                    >
                        <Icon key={id} icon={id} />
                        <code className="block text-xs pt-5">{id}</code>
                    </div>
                ))}
            </div>

            <p>Preview on a button:</p>
            <Button>
                <Icon icon={selectedIcon} /> Demo
            </Button>

            <p>
                See details about{" "}
                <a href={`https://icons.getbootstrap.com/icons/${selectedIcon}/`}>
                    "{selectedIcon}" at Bootstrap Icons
                </a>, or <a href="https://icons.getbootstrap.com/">get more icons</a> (add to <code>Icon.tsx</code>).
            </p>

            <br />

            <h2>More stuff</h2>

            <table>
                <tbody>
                    <UIDemo label="Breadcrumbs">
                        <Breadcrumbs>
                            <Breadcrumb href={"/"}>Home</Breadcrumb>
                            <Breadcrumb href={"/"}>Section</Breadcrumb>
                            <Breadcrumb href={"/"}>Sub-Section</Breadcrumb>
                            <Breadcrumb>This Entry</Breadcrumb>
                        </Breadcrumbs>
                    </UIDemo>
                    <UIDemo label="Tab Bar">
                        <TabBarRouter>
                            <Tab
                                id="main"
                                icon="info-circle"
                                name={defineMessage({ defaultMessage: "Main", id: "EFTSMc" })}
                            >
                                This is the main tab content.
                            </Tab>
                            <Tab
                                id="properties"
                                icon="diamond-fill"
                                name={defineMessage({
                                    defaultMessage: "Properties",
                                    id: "aI80kg",
                                })}
                            >
                                This is the properties tab.
                            </Tab>
                            <Tab
                                id="changes"
                                icon="list"
                                badge={"3"}
                                name={defineMessage({ defaultMessage: "Changes", id: "dgqhUM" })}
                            >
                                This is the changes tab, with a "badge" that says "3".
                            </Tab>
                        </TabBarRouter>
                    </UIDemo>
                    <UIDemo label="Frame">
                        <Frame><FrameBody>This is a &lt;Frame&gt;.</FrameBody></Frame>
                    </UIDemo>
                    <UIDemo label="Frame with toolbar">
                        <Frame>
                            <FrameHeader>
                                <ToolbarButton
                                    icon="zoom-in" onClick={() => undefined}
                                    tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                />
                                <ToolbarButton
                                    icon="zoom-out" onClick={() => undefined}
                                    tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                />
                                <ToolbarSeparator/>
                                <ToolbarButton
                                    icon="info-circle" onClick={() => undefined}
                                    tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                />
                                <ToolbarButton
                                    icon="people-fill" onClick={() => undefined}
                                    tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                />
                            </FrameHeader>
                            <FrameBody>This is a &lt;Frame&gt; with a toolbar/header.</FrameBody>
                        </Frame>
                    </UIDemo>
                    <UIDemo label="Frame inside a frame">
                        <Frame>
                            <FrameHeader>Outer &lt;Frame&gt; header - could be a title or a toolbar</FrameHeader>
                            <FrameBody>
                                <Frame>
                                    <FrameHeader>
                                        <ToolbarButton
                                            icon="zoom-in" onClick={() => undefined}
                                            tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                        />
                                        <ToolbarButton
                                            icon="zoom-out" onClick={() => undefined}
                                            tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                        />
                                        <ToolbarSeparator/>
                                        <ToolbarButton
                                            icon="info-circle" onClick={() => undefined}
                                            tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                        />
                                        <ToolbarButton
                                            icon="people-fill" onClick={() => undefined}
                                            tooltip={defineMessage({defaultMessage: "just a demo toolbar button", id: 'KzohjF'})}
                                        />
                                    </FrameHeader>
                                    <FrameBody>When the &lt;Frame&gt; is inside another &lt;Frame&gt;, it responsively removes its rounded corners, merges its toolbar with the above one, and hides the padding.</FrameBody>
                                </Frame>
                            </FrameBody>
                        </Frame>
                    </UIDemo>
                    <UIDemo label="Spinner">
                        <Spinner />
                    </UIDemo>
                    <UIDemo label="Button">
                        <Button>I'm a button</Button>
                    </UIDemo>
                    <UIDemo label="Select box">
                        <SelectBox
                            value={selectBoxItem}
                            onChange={setSelectBoxItem}
                            options={[
                                {
                                    id: "first",
                                    label: defineMessage({ defaultMessage: "First item", id: "c6B/JF" }),
                                },
                                {
                                    id: "second",
                                    label: defineMessage({ defaultMessage: "Second item", id: "L9aUV9" }),
                                },
                                {
                                    id: "third",
                                    label: defineMessage({ defaultMessage: "Third item", id: "hDD9II" }),
                                },
                            ]}
                        />
                    </UIDemo>
                    <UIDemo label="Select box with icons and many items">
                        <SelectBox
                            value={selectBox2Item}
                            onChange={setSelectBox2Item}
                            options={_allIcons.map((id) => (
                                { id, label: noTranslationNeeded(id), icon: id }
                            ))}
                        />
                    </UIDemo>
                    <UIDemo label="Tooltip">
                        <Tooltip
                            tooltipContent={
                                <>
                                    <strong>Hello</strong> from the tooltip
                                </>
                            }
                        >
                            {(attrs) => <span {...attrs}>hover me.</span>}
                        </Tooltip>
                    </UIDemo>
                    <UIDemo label="Error">
                        <ErrorMessage>Something went wrong.</ErrorMessage>
                    </UIDemo>
                    <UIDemo label="Success">
                        <SuccessMessage>Something went right.</SuccessMessage>
                    </UIDemo>
                    <UIDemo label="Search">
                        <TextInput
                            type="search"
                            icon="search"
                            className="w-[600px] max-w-full"
                            value={searchDemoText}
                            onChange={(event) => setSearchDemoText(event.currentTarget.value)}
                            placeholder={"Example of a search input"}
                        />
                    </UIDemo>
                </tbody>
            </table>

            <h2>Lookup Values</h2>

            <table>
                <tbody>
                    <UIDemo label="Entry Type">
                        <LookupValue value={{ type: "Entry", id: SDK.VNID("_12345") }} mdtContext={demoMDTContext} />
                    </UIDemo>
                    <UIDemo label="Property Type">
                        <LookupExpressionInput value={`this.reverse(prop=prop("_demoProp"))`} onChange={() => null} />
                    </UIDemo>
                </tbody>
            </table>
        </SitePage>
        </RefCacheContext.Provider>
    );
};

export default UiDemoPage;
