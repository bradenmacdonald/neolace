import React from "react";
import { FormattedMessage } from "react-intl";

import { api, useDraft, useSchema } from "lib/api";
import { defineMessage, noTranslationNeeded } from "components/utils/i18n";
import { AutoControl, Checkbox, Control, LookupExpressionInput, MDTEditor, SelectBox, TextInput } from "components/form-input";

interface Props {
    propertyKey: string;
    addSchemaEdit: (edit: api.AnySchemaEdit) => void;
}

/**
 * This widget allows editing a single property
 */
export const EditSchemaProperty: React.FunctionComponent<Props> = ({propertyKey, addSchemaEdit}) => {
    /** The current schema, including any schema changes which haven't yet been saved, if any. */
    const [schema] = useSchema();
    const [_draft, unsavedEdits] = useDraft();

    const updateProperty = React.useCallback((data: Omit<api.schemas.Type<typeof api.UpdateProperty.dataSchema>, "key">) => {
        addSchemaEdit({code: "UpdateProperty", data: {...data, key: propertyKey}});
    }, [addSchemaEdit, propertyKey]);

    const prop: api.PropertyData = schema?.properties[propertyKey] ?? {
        key: propertyKey,
        name: "",
        description: "",
        type: api.PropertyType.Value,
        appliesTo: [],
        rank: 10,
    };

    // We need to wait for the schema to load
    const isLoading = schema === undefined;
    const isNewProperty = !isLoading && (unsavedEdits.find((edit) => (edit.code === "CreateProperty" && edit.data.key === propertyKey)));

    // Available properties for the "parent property" field.
    const possibleParentProps = React.useMemo(() => {
        const props: api.PropertyData[] = [];
        if (!schema) return props;

        for (const p of Object.values(schema.properties)) {
            if (p.key === propertyKey) continue; // This prop can't be its own parent.
            props.push({ ...p });
        }

        props.forEach((p) => {
            const parentPropKeys = p.isA;
            if (parentPropKeys && parentPropKeys.length === 1) {
                const parentProp = props.find((pp) => pp.key === parentPropKeys[0]);
                if (parentProp) {
                    p.name = `${parentProp.name} > ${p.name}`;
                }
            }
        });
        props.sort((a, b) => a.name.localeCompare(b.name));
        return props;
    }, [schema, propertyKey]);

    return <>
        <h1 className="!mt-0 !text-xl">
            <FormattedMessage
                defaultMessage="Edit Property: {name}" id="iWN0UN"
                values={{name: prop.name}}
            />
        </h1>

        <AutoControl
            id="prop-name"
            label={defineMessage({ defaultMessage: "Name", id: "HAlOn1" })}
            value={prop.name}
            onChangeFinished={(name) => updateProperty({name})}
            isRequired
        >
            <TextInput disabled={isLoading} />
        </AutoControl>

        <Control
            id="prop-type"
            label={defineMessage({ defaultMessage: "Type", id: "+U6ozc" })}
            hint={defineMessage({defaultMessage: "Cannot be changed after the property is created", id: 'NsdMnQ'})}
            isRequired
        >
            <SelectBox
                value={prop.type}
                onChange={(type) =>
                    // The type can only be set when creating the property. Even though there is already a "CreateProperty"
                    // edit, it will be consolidated with this one.
                    addSchemaEdit({code: "CreateProperty", data: {key: propertyKey, name: prop.name, type: type as api.PropertyType}})
                }
                options={[
                    {
                        id: api.PropertyType.Value,
                        label: defineMessage({defaultMessage: "Value - a regular property", id: "cWdCN7"}),
                    },
                    {
                        id: api.PropertyType.RelOther,
                        label: defineMessage({defaultMessage: "Relationship - a relationship to another entry", id: "12Hf3L"}),
                    },
                    {
                        id: api.PropertyType.RelIsA,
                        label: defineMessage({defaultMessage: "Relationship (IS A) - this entry is an instance or subclass of another entry", id: "GaeBc2"}),
                    },
                ]}
            readOnly={isLoading || !isNewProperty} />
        </Control>

        {/* Parent property: NOTE: This currently glosses over the fact that properties can have multiple parent properties. */}
        <Control
            id="prop-parent-property"
            label={defineMessage({ defaultMessage: "Parent Property", id: 'EmJtOa' })}
            hint={defineMessage({defaultMessage: "If this is a more specific version of an existing property.", id: 'YRWIMT'})}
        >
            <SelectBox
                value={prop.isA?.[0]}
                onChange={(newParent) =>
                    // The type can only be set when creating the property. Even though there is already a "CreateProperty"
                    // edit, it will be consolidated with this one.
                    updateProperty({isA: newParent ? [newParent as api.VNID] : []})
                }
                options={[
                    {
                        id: "",
                        label: defineMessage({defaultMessage: "[No parent property]", id: 'kyTFFe'}),
                    },
                    ...possibleParentProps.map((p) => ({ id: p.key, label: noTranslationNeeded(p.name) })),
                ]}
            />
        </Control>

        <Control
            id="prop-mode"
            label={defineMessage({ defaultMessage: "Mode", id: 'mrOnjM' })}
            isRequired
        >
            <SelectBox
                value={prop.mode}
                onChange={(mode) => updateProperty({mode: mode as api.PropertyMode})}
                options={[
                    {
                        id: api.PropertyMode.Optional,
                        label: defineMessage({defaultMessage: "Optional", id: "InWqys"}),
                    },
                    {
                        id: api.PropertyMode.Recommended,
                        label: defineMessage({defaultMessage: "Recommended", id: 'VKfWR3'}),
                    },
                    {
                        id: api.PropertyMode.Required,
                        label: defineMessage({defaultMessage: "Required", id: 'Seanpx'}),
                    },
                    {
                        id: api.PropertyMode.Auto,
                        label: defineMessage({defaultMessage: "Auto - computed automatically", id: 'el/GZK'}),
                    },
                ]}
                readOnly={isLoading} />
        </Control>

        <AutoControl
            id="prop-desc"
            label={defineMessage({ defaultMessage: "Description", id: 'Q8Qw5B' })}
            value={prop.description}
            hint={defineMessage({defaultMessage: "Explain clearly what this property is.", id: 'zlcodI'})}
            onChangeFinished={(description) => updateProperty({description})}
        >
            <MDTEditor inlineOnly={true} />
        </AutoControl>

        <Control
            id="prop-applies-to"
            label={defineMessage({ defaultMessage: "Applies to", id: '6WqHWi' })}
        >
            <div>
                {
                    Object.values(schema?.entryTypes ?? []).map((et) => (
                        <Checkbox
                            key={et.key}
                            checked={!!prop.appliesTo.find((e) => e.entryTypeKey === et.key)}
                            disabled={isLoading}
                            onClick={(event) => {
                                addSchemaEdit({
                                    code: "UpdateProperty",
                                    data: {
                                        key: propertyKey,
                                        appliesTo: (
                                            event.currentTarget.checked ? [...prop.appliesTo, {entryTypeKey: et.key}]
                                            : prop.appliesTo.filter((x) => x.entryTypeKey !== et.key)
                                        ),
                                    }
                                })
                            }}
                        >
                            {et.name}
                        </Checkbox>
                    ))
                }
            </div>
        </Control>

        <AutoControl
            id="prop-rank"
            label={defineMessage({ defaultMessage: "Rank", id: 'VP5+CR' })}
            value={String(prop.rank)}
            hint={defineMessage({defaultMessage: "Determines the relative importance of properties, with 0 being the most important (displayed first), and 99 being the least important. Only properties with rank < 50 are shown on entry pages by default.", id: '7uVynN'})}
            onChangeFinished={(rank) => updateProperty({ rank: parseInt(rank) })}
        >
            <TextInput type="number" />
        </AutoControl>

        {
            prop.mode === api.PropertyMode.Auto ?
                <Control
                    id="prop-default"
                    label={defineMessage({ defaultMessage: "Default (Automatic Value)", id: "cmtPlm" })}
                    hint={defineMessage({defaultMessage: "Enter the lookup express that is used to calculate the value of this property automatically.", id: 'OldUKS'})}
                    isRequired
                    >
                    <LookupExpressionInput
                        value={prop.default}
                        onFinishedEdits={(newDefault) => updateProperty({default: newDefault})}
                    />
                </Control>
            :
                <Control
                    id="prop-default"
                    label={defineMessage({ defaultMessage: "Default", id: 'lKv8ex' })}
                    hint={defineMessage({defaultMessage: "Optionally, enter a lookup expression that will be used as the default value for entries that don't have this property set.", id: 'YYsiUh'})}
                >
                    <LookupExpressionInput
                        value={prop.default}
                        onFinishedEdits={(newDefault) => updateProperty({default: newDefault})}
                     />
                </Control>
        }

        <AutoControl
            id="prop-edit-note"
            label={defineMessage({ defaultMessage: "Edit Note", id: '79ml4Z' })}
            value={prop.editNote}
            hint={defineMessage({defaultMessage: "Optionally, provide advice to editors who may be making changes to this property's value.", id: '/4dbk+'})}
            onChangeFinished={(editNote) => updateProperty({editNote})}
        >
            <MDTEditor inlineOnly={true} />
        </AutoControl>

        <AutoControl
            id="prop-display-as"
            label={defineMessage({ defaultMessage: "Display As", id: 'Kj4Eu+' })}
            value={prop.displayAs ?? ""}
            hint={defineMessage({defaultMessage: "Optionally, customize how these values are displayed", id: 'l/ASVB'})}
            onChangeFinished={(displayAs) => updateProperty({displayAs})}
        >
            <TextInput className="font-mono" />
        </AutoControl>

        <Control
            id="prop-options"
            label={defineMessage({ defaultMessage: "Advanced Options", id: 'KxN+uh' })}
        >
            <div>
                <Checkbox
                    checked={!!prop.inheritable}
                    disabled={isLoading}
                    onChange={(event) => updateProperty({inheritable: event.currentTarget.checked})}
                >
                    <FormattedMessage defaultMessage="Inheritable" id="5exPBq" />
                </Checkbox>
                <Checkbox
                    checked={!!prop.enableSlots}
                    disabled={isLoading}
                    onChange={(event) => updateProperty({enableSlots: event.currentTarget.checked})}
                >
                    <FormattedMessage defaultMessage="Enable &quot;Slots&quot;" id="1TV68h" />
                </Checkbox>
            </div>
        </Control>
    </>;
};
