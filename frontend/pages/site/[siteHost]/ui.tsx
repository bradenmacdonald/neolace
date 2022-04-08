import React from 'react';
import { NextPage } from 'next';
import { useIntl } from 'react-intl';


import { SitePage } from 'components/SitePage';
import FourOhFour from 'pages/404';
import { Icon, IconId, _allIcons } from 'components/widgets/Icon';
import { Button } from 'components/widgets/Button';
import { TextInput } from 'components/widgets/TextInput';
import { LookupExpressionInput } from 'components/widgets/LookupExpressionInput';
import { Spinner } from 'components/widgets/Spinner';
import { Tooltip } from 'components/widgets/Tooltip';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
import { Breadcrumb, Breadcrumbs } from 'components/widgets/Breadcrumbs';
import { Control, Form } from 'components/widgets/Form';

// interface PageProps {
// }

const UIDemo = (props: {label: string, children: React.ReactNode}) => {
    return <tr>
        <th className="pb-4 align-top pr-4 text-left">{props.label}</th>
        <td className="pb-4 align-top">{props.children}</td>
    </tr>;
};

const UiDemoPage: NextPage = function(props) {

    const intl = useIntl();
    const [selectedIcon, setSelectedIcon] = React.useState<IconId>("search");
    const [textDemoText, setTextDemoText] = React.useState("");
    const [searchDemoText, setSearchDemoText] = React.useState("");
    const [lookupDemoText, setLookupDemoText] = React.useState("");

    if (process.env.NODE_ENV === "production") {
        return <FourOhFour/>;
    }


    return (
        <SitePage
            title="UI Demos"
            sitePreloaded={null}
        >
            <h1 className="text-3xl font-semibold">UI Demos</h1>

            <p>This page (for development only) provides a demo of the various Neolace UI components.</p>

            <h2>Form</h2>

            <p>Here is an example of our form component.</p>

            <Form>
                <Control id="form-email" label={{id: "ui.demo.form.email", defaultMessage: "Your Email"}}>
                    <TextInput />
                </Control>
                <Control
                    id="form-lookup-expr"
                    label={{id: "ui.demo.form.lookup", defaultMessage: "Lookup Expression"}}
                    hint={intl.formatMessage({id: "ui.demo.form.lookupHint", defaultMessage: "Try using SHIFT-ENTER to create multiple lines, or entering a long string to see the box expand."})}
                >
                    <LookupExpressionInput
                        value={lookupDemoText}
                        onChange={setLookupDemoText}
                        placeholder={"Enter a lookup expression"}
                    />
                </Control>
            </Form>

            <h2>Icons</h2>

            <div className="flex flex-wrap">
                {
                    _allIcons.map(id => <div key={id} className="inline-block w-32 h-32 border-2 m-2 text-center text-4xl pt-6 hover:border-theme-link-color" onClick={() => setSelectedIcon(id)}>
                        <Icon key={id} icon={id} /><code className="block text-xs pt-5">{id}</code>
                    </div>)
                }
            </div>

            <p>Preview on a button:</p>
            <Button><Icon icon={selectedIcon} /> Demo</Button>

            <p>See more: <a href={`https://icons.getbootstrap.com/icons/${selectedIcon}/`}>"{selectedIcon}" at Bootstrap Icons</a>.</p>

            <br/>

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
                    <UIDemo label="Spinner"><Spinner/></UIDemo>
                    <UIDemo label="Button"><Button>I'm a button</Button></UIDemo>
                    <UIDemo label="Tooltip">
                        <Tooltip tooltipContent={<><strong>Hello</strong> from the tooltip</>}>{(attrs) => <span {...attrs}>hover me.</span>}</Tooltip>
                    </UIDemo>
                    <UIDemo label="Error"><ErrorMessage>Something went wrong.</ErrorMessage></UIDemo>
                    <UIDemo label="Search">
                        <TextInput
                            type="search"
                            icon="search"
                            className="w-[600px] max-w-full"
                            value={searchDemoText}
                            onChange={event => setSearchDemoText(event.currentTarget.value)}
                            placeholder={"Example of a search input"}
                        />
                    </UIDemo>
                </tbody>
            </table>

        </SitePage>
    );
}

export default UiDemoPage;