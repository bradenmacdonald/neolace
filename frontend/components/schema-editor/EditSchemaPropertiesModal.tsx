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

import { SDK, DraftContext, DraftContextData, useDraft } from "lib/sdk";
import { Modal } from "components/widgets/Modal";
import { Button } from "components/widgets/Button";
import { FormattedMessage } from "react-intl";
import { ListSchemaProperties } from "./ListSchemaProperties";
import { defineMessage } from "components/utils/i18n";
import { ButtonLink } from "components/widgets/ButtonLink";
import { EditSchemaProperty } from "./EditSchemaProperty";
import { AddSchemaProperty } from "./AddSchemaProperty";

interface Props {
    onSaveChanges: (newEdits: SDK.AnySchemaEdit[]) => void;
    onCancel: () => void;
}

const NEW_PROPERTY = Symbol("new-prop");

/**
 * This widget implements the modal that pops up to allow editing all of the properties in the schema
 */
export const EditSchemaPropertiesModal: React.FunctionComponent<Props> = ({ onSaveChanges, onCancel }) => {

    const [draft, unsavedEditsInDraft] = useDraft();
    const [unsavedEditsInModal, setUnsavedEditsInModal] = React.useState([] as SDK.AnySchemaEdit[]);
    const saveChanges = React.useCallback(() => {
        onSaveChanges(unsavedEditsInModal);
    }, [onSaveChanges, unsavedEditsInModal]);

    /** Add a new edit */
    const addSchemaEdit = React.useCallback((newEdit: SDK.AnySchemaEdit) => {
        setUnsavedEditsInModal((edits) => {
            console.log(newEdit, edits);
            return SDK.consolidateEdits([...edits, newEdit]);
        });
    }, []);

    // If this has a property ID, we're viewing details of a single property; otherwise we're listing all properties.
    const [showingPropertyDetails, showPropertyDetails] = React.useState<string|typeof NEW_PROPERTY|undefined>();

    const scrollingDiv = React.useRef<HTMLDivElement>(null);
    /** Add a new property to the schema when the user clicks the add new property button. */
    const addNewProperty = React.useCallback(() => {
        showPropertyDetails(NEW_PROPERTY);
        // If the list of properties is long, when we change to show the new property we need to scroll the modal back
        // to the top, or else we'll only see the bottom part of the "edit property" form.
        scrollingDiv.current?.scrollTo({top: 0});
    }, []);

    // Within this modal, we combine the pending edits from the modal with any unsaved edits from the draft
    const newDraftContext: DraftContextData = {
        draftNum: draft?.num,
        unsavedEdits: [...unsavedEditsInDraft, ...unsavedEditsInModal],
    }
    return (
        <Modal
            title={defineMessage({defaultMessage: "All Properties", id: 'YJOOld'})}
            className="w-[800px] max-w-screen h-[600px] max-h-screen"
            onClose={onCancel}
            scrollableRef={scrollingDiv}
            actionBar={<>
                <Button
                    icon="check-circle-fill"
                    bold={true}
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
            <DraftContext.Provider value={newDraftContext}>
                <div className={`${showingPropertyDetails ? "hidden" : ""}`}>
                    {/* We use CSS to hide the property list when we're showing details so that it'll preserve its state, like the current search query */}
                    <ListSchemaProperties showPropertyDetails={showPropertyDetails} onAddProperty={addNewProperty} />
                </div>
                {showingPropertyDetails === NEW_PROPERTY ?
                    <>
                        <ButtonLink onClick={() => showPropertyDetails(undefined)}>
                            &lt;{" "}<FormattedMessage defaultMessage="Cancel and go back to all properties" id="KbGXvM" />
                        </ButtonLink><br /><br />

                        <AddSchemaProperty
                            onAddProperty={(edit) => {addSchemaEdit(edit); showPropertyDetails(edit.data.key); }}
                        />
                    </>
                : showingPropertyDetails ?
                    <>
                        <ButtonLink onClick={() => showPropertyDetails(undefined)}>
                            &lt;{" "}<FormattedMessage defaultMessage="Back to all properties" id="C0B87U" />
                        </ButtonLink><br /><br />

                        <EditSchemaProperty
                            propertyKey={showingPropertyDetails}
                            addSchemaEdit={addSchemaEdit}
                        />

                        <ButtonLink onClick={() => showPropertyDetails(undefined)}>
                            &lt;{" "}<FormattedMessage defaultMessage="Back to all properties" id="C0B87U" />
                        </ButtonLink><br /><br />
                    </>
                : null}
            </DraftContext.Provider>
        </Modal>
    );
};
