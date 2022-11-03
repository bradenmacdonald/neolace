import React from "react";
import { FormattedMessage } from "react-intl";
import { VNID } from "neolace-api";

import { api, useSchema } from "lib/api";
import { Spinner } from "components/widgets/Spinner";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";
import { defineMessage } from "components/utils/i18n";
import { Control, TextInput } from "components/form-input";
import { ButtonLink } from "components/widgets/ButtonLink";
import { Button } from "components/widgets/Button";

interface Props {
    showPropertyDetails?: (propertyId: VNID) => void;
    onAddProperty?: () => void;
}

/**
 * This widget lists all of the available properties in the schema
 */
export const ListSchemaProperties: React.FunctionComponent<Props> = (props) => {
    /** The current schema, including any schema changes which haven't yet been saved, if any. */
    const [schema] = useSchema();

    const [searchKeyword, setSearchKeyword] = React.useState("");

    const filteredProps = React.useMemo(() => {
        let props: api.PropertyData[] = [];
        if (!schema) {
            return props;
        }

        for (const p of Object.values(schema.properties)) {
            props.push({ ...p });
        }

        props.forEach((p) => {
            const parentPropIds = p.isA;
            if (parentPropIds && parentPropIds.length === 1) {
                const parentProp = props.find((pp) => pp.id === parentPropIds[0]);
                if (parentProp) {
                    p.name = `${parentProp.name} > ${p.name}`;
                }
            }
        });
        props.sort((a, b) => a.name.localeCompare(b.name));

        if (searchKeyword) {
            const keywordLower = searchKeyword.toLowerCase();
            props = props.filter((p) => p.name.toLowerCase().includes(keywordLower) || p.description.toLowerCase().includes(keywordLower))
        }

        return props;
    }, [schema, searchKeyword]);

    const mdtContext = React.useMemo(() => new MDTContext({}), []);
    
    // We need to wait for the schema to load
    if (!schema) {
        return <Spinner />;
    }

    return <>
        <div id="schema-properties">
            <p><FormattedMessage defaultMessage="Here you can see all of the properties currently defined in this site's schema." id="3vyBXD"/></p>

            <Control id="search-all-props" label={defineMessage({defaultMessage: "Search properties", id: 'Sb1oQi'})}>
                <TextInput 
                    type="search"
                    icon="search"
                    value={searchKeyword}
                    onChange={(ev) => setSearchKeyword(ev.target.value)}
                />
            </Control>

            {schema === undefined ? <Spinner /> : null}
            <ol>
                {
                    filteredProps.map((prop) => (
                        <li key={prop.id}>
                            {
                                props.showPropertyDetails ?
                                    <ButtonLink onClick={() => props.showPropertyDetails?.(prop.id)}>
                                        <strong>{prop.name || "[??]"}</strong>
                                    </ButtonLink>
                                :
                                    <strong>{prop.name || "[??]"}</strong>
                            }
                            {' '}
                            {prop.type !== api.PropertyType.Value ? <span className="text-xs rounded-lg bg-yellow-100 py-[2px] px-[4px] mr-1 cursor-default">
                                <FormattedMessage defaultMessage="Relationship" id="/OEORY"/>
                            </span> : null}
                            {/* Display a little icon for each entry type this property applies to: */}
                            {prop.appliesTo.map(({entryType}) => (
                                <span
                                    key={entryType}
                                    className="text-xs rounded-lg py-[2px] px-[4px] mx-1 inline-block min-w-[1.5em] text-center cursor-default"
                                    title={schema.entryTypes[entryType]?.name}
                                    style={{
                                        backgroundColor: api.getEntryTypeColor(schema.entryTypes[entryType]).backgroundColor,
                                        color: api.getEntryTypeColor(schema.entryTypes[entryType]).textColor,
                                    }}
                                >{schema.entryTypes[entryType]?.abbreviation || "\u2003"}</span>
                            ))}
                            <br />

                            <div className="text-sm"><InlineMDT mdt={prop.description} context={mdtContext}/></div>
                        </li>
                    ))
                }
            </ol>

            <Button icon="plus-lg" onClick={props.onAddProperty}>
                <FormattedMessage defaultMessage="Add new property" id="GeaXIv"/>
            </Button>
        </div>
    </>;
};
