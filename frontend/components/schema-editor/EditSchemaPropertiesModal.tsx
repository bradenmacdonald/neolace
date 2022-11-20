import React from "react";

import { api, DraftContext, DraftContextData, useDraft } from "lib/api";
import { Modal } from "components/widgets/Modal";
import { Button } from "components/widgets/Button";
import { FormattedMessage } from "react-intl";
import { ListSchemaProperties } from "./ListSchemaProperties";
import { defineMessage } from "components/utils/i18n";
import { ButtonLink } from "components/widgets/ButtonLink";
import { EditSchemaProperty } from "./EditSchemaProperty";

interface Props {
    onSaveChanges: (newEdits: api.AnySchemaEdit[]) => void;
    onCancel: () => void;
}

/**
 * This widget implements the modal that pops up to allow editing all of the properties in the schema
 */
export const EditSchemaPropertiesModal: React.FunctionComponent<Props> = ({ onSaveChanges, onCancel }) => {

    const [draft, unsavedEditsInDraft] = useDraft();
    const [unsavedEditsInModal, setUnsavedEditsInModal] = React.useState([] as api.AnySchemaEdit[]);
    const saveChanges = React.useCallback(() => {
        onSaveChanges(unsavedEditsInModal);
    }, [onSaveChanges, unsavedEditsInModal]);

    /** Add a new edit */
    const addSchemaEdit = React.useCallback((newEdit: api.AnySchemaEdit) => {
        setUnsavedEditsInModal((edits) => {
            console.log(newEdit, edits);
            return api.consolidateEdits([...edits, newEdit]);
        });
    }, []);

    // If this has a property ID, we're viewing details of a single property; otherwise we're listing all properties.
    const [showingPropertyDetails, showPropertyDetails] = React.useState<api.VNID|undefined>();

    const scrollingDiv = React.useRef<HTMLDivElement>(null);
    /** Add a new property to the schema when the user clicks the add new property button. */
    const addNewProperty = React.useCallback(() => {
        const id = api.VNID();
        addSchemaEdit({code: "CreateProperty", data: {id, name: ""}});
        showPropertyDetails(id);
        // If the list of properties is long, when we change to show the new property we need to scroll the modal back
        // to the top, or else we'll only see the bottom part of the "edit property" form.
        scrollingDiv.current?.scrollTo({top: 0});
    }, [addSchemaEdit]);

    // Within this modal, we combine the pending edits from the modal with any unsaved edits from the draft
    const newDraftContext: DraftContextData = {
        draftIdNum: draft?.idNum,
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
                {showingPropertyDetails ?
                    <>
                        <ButtonLink onClick={() => showPropertyDetails(undefined)}>
                            &lt;{" "}<FormattedMessage defaultMessage="Back to all properties" id="C0B87U" />
                        </ButtonLink><br /><br />

                        <EditSchemaProperty propertyId={showingPropertyDetails} addSchemaEdit={addSchemaEdit} />

                        <ButtonLink onClick={() => showPropertyDetails(undefined)}>
                            &lt;{" "}<FormattedMessage defaultMessage="Back to all properties" id="C0B87U" />
                        </ButtonLink><br /><br />
                    </>
                : null}
            </DraftContext.Provider>
        </Modal>
    );
};
