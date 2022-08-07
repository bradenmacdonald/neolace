import React, { ChangeEvent } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { VNID } from "neolace-api";

import { defineMessage, displayText, noTranslationNeeded } from "components/utils/i18n";
import { api, useSchema } from "lib/api-client";
import { Spinner } from "components/widgets/Spinner";
import { AutoControl, Control, Form } from "components/widgets/Form";
import { SelectBox } from "components/widgets/SelectBox";
import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { Button, ToolbarButton } from "components/widgets/Button";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";
import { Modal } from "components/widgets/Modal";
import { TextInput } from "components/widgets/TextInput";
import { MDTEditor } from "components/widgets/MDTEditor";
import { Icon } from "components/widgets/Icon";
import { Checkbox } from "components/widgets/Checkbox";

// We have to declare this empty object outside of the function below so it doesn't change on every call.
const emptyPropsRawArray: api.EditableEntryData["propertiesRaw"] = [];

interface Props {
    /** The ID of the entry type to edit. Pass in a randomly generated new ID to create a new entry type. */
    entryTypeId: VNID;
    onSaveChanges: (newEdits: api.AnySchemaEdit[]) => void;
    onCancel: () => void;
}

/**
 * This widget implements the modal that pops up to allow creating/editing an entry
 */
export const EntryTypeModal: React.FunctionComponent<Props> = ({ entryTypeId, onSaveChanges, onCancel }) => {
    /** The current schema, including any schema changes which have already been made within the current draft, if any. */
    const [baseSchema] = useSchema();
    const [unsavedEdits, setUnsavedEdits] = React.useState([] as api.AnySchemaEdit[]);
    /** The schema PLUS any changes that the user has made within this modal, but not yet saved to the draft */
    const updatedSchema = React.useMemo(
        () => baseSchema ? api.applyEditsToSchema(baseSchema, unsavedEdits) : undefined,
        [baseSchema, unsavedEdits],
    );

    const entryType: api.EntryTypeData = updatedSchema?.entryTypes[entryTypeId] ?? {
        id: entryTypeId,
        name: "",
        abbreviation: "",
        color: api.EntryTypeColor.Default,
        description: "",
        enabledFeatures: {},
        friendlyIdPrefix: "",
    };

    const confirmClose = React.useCallback(() => {
        if (unsavedEdits.length === 0 || confirm("Are you sure you want to discard these entry type edits?")) {
            onCancel();
        }
    }, [unsavedEdits.length, onCancel]);

    /** Tell the parent page that we're done editing/creating this entry type, and save the changes into the draft */
    const saveChanges = React.useCallback(() => {
        onSaveChanges(unsavedEdits);
    }, [onSaveChanges, unsavedEdits]);

    const pushEdit = React.useCallback((edit: api.AnySchemaEdit) => {
        if (!baseSchema) return;
        let newEdits = [...unsavedEdits];
        if (baseSchema.entryTypes[entryTypeId] === undefined && unsavedEdits.length === 0) {
            // If this is a brand new entry, we need a "CreateEntryType" edit to come first.
            newEdits.push({
                code: "CreateEntryType",
                data: { id: entryTypeId, name: "" },
            });
        }
        newEdits.push(edit);
        newEdits = api.consolidateEdits(newEdits);
        setUnsavedEdits(newEdits);
    }, [entryTypeId, unsavedEdits, baseSchema]);

    const update = React.useCallback((data: {
        name?: string;
        abbreviation?: string;
        friendlyIdPrefix?: string;
        description?: string;
        color?: api.EntryTypeColor;
    }) => {
        pushEdit({ code: "UpdateEntryType", data: { id: entryTypeId, ...data } });
    }, [entryTypeId, pushEdit]);

    const updateFeature = React.useCallback(
        (feature: api.schemas.Type<typeof api.UpdateEntryTypeFeature.dataSchema>["feature"]) => {
            pushEdit({ code: "UpdateEntryTypeFeature", data: { entryTypeId, feature } });
        },
        [entryTypeId, pushEdit],
    );

    const updateName = React.useCallback(
        (event: ChangeEvent<HTMLInputElement>) => update({ name: event.target.value }),
        [update],
    );
    const updateAbbreviation = React.useCallback(
        (event: ChangeEvent<HTMLInputElement>) => update({ abbreviation: event.target.value }),
        [update],
    );
    const updateFriendlyIdPrefix = React.useCallback(
        (event: ChangeEvent<HTMLInputElement>) => update({ friendlyIdPrefix: event.target.value }),
        [update],
    );
    const updateDescription = React.useCallback(
        (newDescription: string) => update({ description: newDescription }),
        [update],
    );
    const updateColor = React.useCallback(
        (newColor: string) => update({ color: newColor as api.EntryTypeColor }),
        [update],
    );

    // We need to wait for the schema to load, so we know if this is a new entry type or an existing one.
    if (!updatedSchema) {
        return <Spinner />;
    }

    return (
        <Modal
            className="w-full max-w-4xl h-[600px] max-h-screen overflow-y-auto neo-typography"
            onClose={confirmClose}
        >
            <div className="p-2">
                <h2>
                    <FormattedMessage
                        defaultMessage="Edit Entry Type"
                        id="qEou9X"
                    />
                </h2>
                <Form>
                    <Control
                        id="typeName"
                        label={defineMessage({ defaultMessage: "Name", id: "HAlOn1" })}
                        hint={defineMessage({
                            defaultMessage: "Name of this entry type, e.g. Person, Blog Post, City, Concept",
                            id: "zqxsMO",
                        })}
                        isRequired={true}
                    >
                        <TextInput
                            value={entryType.name}
                            onChange={updateName}
                        />
                    </Control>

                    <Control
                        id="typeAbbreviation"
                        label={defineMessage({ defaultMessage: "Abbreviation", id: "jAFB5+" })}
                        hint={defineMessage({
                            defaultMessage:
                                'One or two letters or symbols that can be used to indicate this entry type, e.g. "C" for Concept.',
                            id: "D1CkDD",
                        })}
                    >
                        <TextInput
                            value={entryType.abbreviation}
                            maxLength={2}
                            onChange={updateAbbreviation}
                        />
                    </Control>

                    {/* Friendly ID Prefix */}
                    <Control
                        id="typeFriendlyIdPrefix"
                        label={defineMessage({ defaultMessage: "Friendly ID Prefix", id: "Nyt0X2" })}
                        hint={defineMessage({
                            defaultMessage:
                                'If you want to require that the Friendly ID (used in the URL) starts with a prefix like "concept-", enter that prefix here.',
                            id: "mG3FFG",
                        })}
                    >
                        <TextInput
                            value={entryType.friendlyIdPrefix}
                            onChange={updateFriendlyIdPrefix}
                        />
                    </Control>

                    {/* Color */}
                    <Control
                        id="typeColor"
                        label={defineMessage({ id: "uMhpKe", defaultMessage: "Color" })}
                    >
                        <SelectBox
                            value={entryType.color}
                            onChange={updateColor}
                            options={Object.entries(api.EntryTypeColor).map(([label, id]) => ({
                                id,
                                label: noTranslationNeeded(label),
                            }))}
                            renderOption={(option) => ({
                                classNameList: "",
                                classNameButton: "",
                                node: (
                                    <>
                                        <span
                                            style={{ color: api.entryTypeColors[option.id as api.EntryTypeColor]?.[1] }}
                                        >
                                            <Icon icon="square-fill" />
                                        </span>{" "}
                                        {displayText(option.label)}
                                    </>
                                ),
                            })}
                        />
                    </Control>

                    {/* Description */}
                    <AutoControl
                        value={entryType.description}
                        onChangeFinished={updateDescription}
                        id="typeDescription"
                        label={defineMessage({ defaultMessage: "Description", id: "Q8Qw5B" })}
                    >
                        <MDTEditor inlineOnly={true} />
                    </AutoControl>

                    {/* Enabled Features */}
                    <Control
                        id="typeEnabledFeatures"
                        label={defineMessage({ defaultMessage: "Enabled Features", id: "sZtU3y" })}
                    >
                        <div>
                            <Checkbox
                                checked={entryType.enabledFeatures.Article !== undefined}
                                onChange={(ev) => {
                                    updateFeature({ featureType: "Article", enabled: ev.target.checked, config: {} });
                                }}
                            >
                                <FormattedMessage defaultMessage="Article" id="jx7Hn3" />
                            </Checkbox>
                            <Checkbox
                                checked={entryType.enabledFeatures.Image !== undefined}
                                onChange={(ev) => {
                                    updateFeature({ featureType: "Image", enabled: ev.target.checked, config: {} });
                                }}
                            >
                                <FormattedMessage defaultMessage="Image" id="+0zv6g" />
                            </Checkbox>
                            <Checkbox
                                checked={entryType.enabledFeatures.Files !== undefined}
                                onChange={(ev) => {
                                    updateFeature({ featureType: "Files", enabled: ev.target.checked, config: {} });
                                }}
                            >
                                <FormattedMessage defaultMessage="Files" id="m4vqJl" />
                            </Checkbox>
                            <Checkbox
                                checked={entryType.enabledFeatures.HeroImage !== undefined}
                                onChange={(ev) => {
                                    updateFeature({
                                        featureType: "HeroImage",
                                        enabled: ev.target.checked,
                                        config: { lookupExpression: "" },
                                    });
                                }}
                            >
                                <FormattedMessage defaultMessage="Hero Image" id="CY5Km9" />
                            </Checkbox>
                        </div>
                    </Control>

                    {/* Hero Image Lookup Expression */}
                    {entryType.enabledFeatures.HeroImage
                        ? (
                            <Control
                                id="typeFeatureHeroImageExpr"
                                label={defineMessage({ defaultMessage: "Hero Image Lookup", id: "2/Cx2D" })}
                                hint={defineMessage({
                                    defaultMessage:
                                        "A lookup expression that defines what image to display at the top of this entry's page. Commonly something like 'this.get(prop=Hero Image)'",
                                    id: "3eR8XD",
                                })}
                            >
                                <LookupExpressionInput
                                    value={entryType.enabledFeatures.HeroImage.lookupExpression}
                                    onChange={(lookupExpression) => {
                                        updateFeature({
                                            featureType: "HeroImage",
                                            enabled: true,
                                            config: { lookupExpression },
                                        });
                                    }}
                                />
                            </Control>
                        )
                        : null}

                    <Button
                        icon="check-circle-fill"
                        bold={true}
                        disabled={entryType.name === ""}
                        onClick={saveChanges}
                    >
                        <FormattedMessage defaultMessage="Save" id="jvo0vs" />
                    </Button>
                    <Button
                        onClick={onCancel}
                    >
                        <FormattedMessage defaultMessage="Cancel" id="47FYwb" />
                    </Button>
                </Form>
            </div>
        </Modal>
    );
};
