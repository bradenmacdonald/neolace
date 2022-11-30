import React from "react";
import { FormattedMessage } from "react-intl";

import { api, useSchema } from "lib/api";
import { defineMessage } from "components/utils/i18n";
import { Control, SelectBox, TextInput } from "components/form-input";
import { slugify } from "lib/slugify";
import { Button } from "components/widgets/Button";

interface Props {
    onAddProperty: (edit: api.AnySchemaEdit & {code: "CreateProperty"}) => void;
}

/**
 * This widget allows creating a new property
 */
export const AddSchemaProperty: React.FunctionComponent<Props> = ({onAddProperty}) => {
    const [newName, setNewName] = React.useState("");
    const [newKey, setNewKey] = React.useState("");
    const [newPropType, setNewPropType] = React.useState(undefined as api.PropertyType|undefined);
    /** The current schema, including any schema changes which haven't yet been saved, if any. */
    const [schema] = useSchema();
    const recommendedKey = slugify(newName).slice(0, 50);

    const saveProperty = React.useCallback(() => {
        onAddProperty({
            code: "CreateProperty",
            data: {key: newKey, name: newName, type: newPropType}
        });
    }, [newName, newKey, newPropType, onAddProperty]);

    return <>
        <h1 className="!mt-0 !text-xl">
            <FormattedMessage defaultMessage="Create New Property" id="lznJYP" />
        </h1>

        <Control
            id="prop-name"
            label={defineMessage({ defaultMessage: "Name", id: "HAlOn1" })}
            isRequired
        >
            <TextInput value={newName} onChange={(event) => setNewName(event.target.value)} />
        </Control>

        <Control
            id="prop-key"
            label={defineMessage({ defaultMessage: "Key", id: 'EcglP9' })}
            isRequired
            hint={defineMessage({
                defaultMessage: "The identifier of this property. Cannot contain spaces or punctuation or than dashes. Cannot be changed after the property is created.",
                id: 'mQYTLw',
            })}
        >
            <TextInput
                value={newKey}
                placeholder={recommendedKey}
                onChange={(event) => setNewKey(event.target.value)}
                onFocus={() => { if (newKey === "" && recommendedKey) setNewKey(recommendedKey); }}
            />
        </Control>

        <Control
            id="prop-type"
            label={defineMessage({ defaultMessage: "Type", id: "+U6ozc" })}
            hint={defineMessage({defaultMessage: "Cannot be changed after the property is created", id: 'NsdMnQ'})}
            isRequired
        >
            <SelectBox
                value={newPropType}
                onChange={(type) => setNewPropType(type as api.PropertyType)}
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
            />
        </Control>

        <Button
            icon="plus-lg"
            onClick={saveProperty}
            disabled={!newName || !newKey || newKey in Object.keys(schema?.properties ?? {}) || !newPropType}
        >
            <FormattedMessage defaultMessage="Create Property" id="VnQX3t" />
        </Button>
    </>;
};
