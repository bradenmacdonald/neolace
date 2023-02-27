import React from "react";
import { FormattedMessage } from "react-intl";

import { defineMessage, displayText, noTranslationNeeded } from "components/utils/i18n";
import { api, useSchema } from "lib/api";
import { Spinner } from "components/widgets/Spinner";
import { Button } from "components/widgets/Button";
import { Modal } from "components/widgets/Modal";
import { Icon } from "components/widgets/Icon";
import { slugify } from "lib/slugify";
import { AutoControl, Control, Form } from "components/form-input/Form";
import { TextInput } from "components/form-input/TextInput";
import { SelectBox } from "components/form-input/SelectBox";
import { MDTEditor } from "components/form-input/MDTEditor";
import { Checkbox } from "components/form-input/Checkbox";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";

interface Props {
    /** The ID of the entry type to edit. Leave undefined to create a new entry type. */
    existingEntryTypeKey?: string;
    onSaveChanges: (entryTypeKey: string, newEdits: api.AnySchemaEdit[]) => void;
    onCancel: () => void;
}

/**
 * This widget implements the modal that pops up to allow creating/editing an entry type
 */
export const EntryTypeModal: React.FunctionComponent<Props> = ({ existingEntryTypeKey, onSaveChanges, onCancel }) => {
    /** IF we're creating a new entry type, this is its new key */
    const [newKey, setNewKey] = React.useState("");
    /** The current schema, including any schema changes which have already been made within the current draft, if any. */
    const [baseSchema] = useSchema();
    const [unsavedEdits, setUnsavedEdits] = React.useState([] as api.AnySchemaEdit[]);
    /** The schema PLUS any changes that the user has made within this modal, but not yet saved to the draft */
    const updatedSchema = React.useMemo(
        () => baseSchema ? api.applyEditsToSchema(baseSchema, unsavedEdits) : undefined,
        [baseSchema, unsavedEdits],
    );

    const key = existingEntryTypeKey ?? newKey;

    const entryType: api.EntryTypeData = updatedSchema?.entryTypes[key] ?? {
        key,
        name: "",
        abbreviation: "",
        color: api.EntryTypeColor.Default,
        description: "",
        enabledFeatures: {},
        keyPrefix: "",
    };
    /** For new entries, this is the suggested key made from slugifying the name: */
    const recommendedKey = slugify(entryType.name).slice(0, 50);

    const confirmClose = React.useCallback(() => {
        if (unsavedEdits.length === 0 || confirm("Are you sure you want to discard these entry type edits?")) {
            onCancel();
        }
    }, [unsavedEdits.length, onCancel]);

    /** Tell the parent page that we're done editing/creating this entry type, and save the changes into the draft */
    const saveChanges = React.useCallback(() => {
        onSaveChanges(key, unsavedEdits);
    }, [key, onSaveChanges, unsavedEdits]);

    const pushEdit = React.useCallback((edit: api.AnySchemaEdit) => {
        if (!baseSchema) return;
        let newEdits = [...unsavedEdits];
        if (baseSchema.entryTypes[key] === undefined && unsavedEdits.length === 0) {
            // If this is a brand new entry, we need a "CreateEntryType" edit to come first.
            newEdits.push({
                code: "CreateEntryType",
                data: { key, name: "" },
            });
        }
        newEdits.push(edit);
        newEdits = api.consolidateEdits(newEdits);
        setUnsavedEdits(newEdits);
    }, [key, unsavedEdits, baseSchema]);

    const update = React.useCallback((data: {
        name?: string;
        abbreviation?: string;
        keyPrefix?: string;
        description?: string;
        color?: api.EntryTypeColor;
        colorCustom?: string;
    }) => {
        pushEdit({ code: "UpdateEntryType", data: { key, ...data } });
    }, [key, pushEdit]);

    const updateFeature = React.useCallback(
        (feature: api.schemas.Type<typeof api.UpdateEntryTypeFeature.dataSchema>["feature"]) => {
            pushEdit({ code: "UpdateEntryTypeFeature", data: { entryTypeKey: key, feature } });
        },
        [key, pushEdit],
    );

    const updateName = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => update({ name: event.target.value }),
        [update],
    );
    const updateKey = React.useCallback(
        (eventOrKey: React.ChangeEvent<HTMLInputElement>|string) => {
            const updatedKey = typeof eventOrKey === "string" ? eventOrKey : eventOrKey.target.value;
            if (existingEntryTypeKey) throw new Error("Can't change key of existing entry type.");
            setNewKey(updatedKey);
            // Update any existing edits to change their key:
            setUnsavedEdits((existingEdits) => {
                const newEdits = existingEdits.map((ee) => ({code: ee.code, data: {...ee.data}})) as typeof existingEdits;
                for (const e of newEdits) {
                    if ("entryTypeKey" in e.data) e.data.entryTypeKey = updatedKey;
                    else if ("key" in e.data) e.data.key = updatedKey;
                    else throw new Error(`Can't update the key of edit ${e.code}`);
                }
                return newEdits;
            });
        },
        [existingEntryTypeKey],
    );
    const updateAbbreviation = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => update({ abbreviation: event.target.value }),
        [update],
    );
    const updateKeyPrefix = React.useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => update({ keyPrefix: event.target.value }),
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
            className="w-full max-w-4xl h-[600px] max-h-screen overflow-y-auto"
            onClose={confirmClose}
            title={defineMessage({defaultMessage: "Edit Entry Type", id: "qEou9X"})}
            actionBar={<>
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
            </>}
        >
            <div>
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
                        id="typeKey"
                        label={defineMessage({ defaultMessage: "Key", id: 'EcglP9' })}
                        hint={defineMessage({
                            defaultMessage: "The identifier of this entry type. Cannot contain spaces or punctuation or than dashes. Cannot be changed after the entry type is created.",
                            id: 'mC+Iiu',
                        })}
                        isRequired={true}
                    >
                        <TextInput
                            value={key}
                            onChange={updateKey}
                            placeholder={recommendedKey}
                            readOnly={existingEntryTypeKey !== undefined}
                            disabled={existingEntryTypeKey !== undefined}
                            onFocus={() => { if (key === "" && recommendedKey) updateKey(recommendedKey); }}
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

                    {/* Entry Key Prefix */}
                    <Control
                        id="typeKeyPrefix"
                        label={defineMessage({ defaultMessage: "Entry Key Prefix", id: 'bID/Pj' })}
                        hint={defineMessage({
                            defaultMessage:
                                'If you want to require that the keys (the identifier used in the URL) of entries of this type must start with a prefix like "concept-", enter that prefix here.',
                            id: '0M5Hhi',
                        })}
                    >
                        <TextInput
                            value={entryType.keyPrefix}
                            onChange={updateKeyPrefix}
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
                                            style={{ color: api.getEntryTypeColor({color: option.id as api.EntryTypeColor, colorCustom: entryType.colorCustom}).darkerBackgroundColor }}
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
                </Form>
            </div>
        </Modal>
    );
};
