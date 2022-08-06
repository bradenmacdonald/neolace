import React from "react";
import { FormattedMessage } from "react-intl";
import { VNID } from "neolace-api";

import { noTranslationNeeded, TranslatableString } from "components/utils/i18n";
import { useSchema } from "lib/api-client";
import { ErrorMessage } from "./ErrorMessage";
import { SelectBox, SelectOption } from "./SelectBox";

interface Props {
    value?: VNID;
    readOnly?: boolean;
    onChange?: (newEntryType: VNID) => void;
    /** Add an additonal option to the menu that is not an entry type, like "Add New Entry" or "No Entry Type" */
    extraOption?: TranslatableString;
    onSelectExtraOption?: () => void;
}

const extraOptionId = "\0";

/**
 * A select widget for chosing an EntryType
 */
export const SelectEntryType: React.FunctionComponent<Props> = ({ extraOption, onSelectExtraOption, onChange, ...props }) => {
    const [schema, schemaError] = useSchema();

    const options: SelectOption[] = React.useMemo(() => {
        if (!schema) {
            return [];
        }
        const sortedTypes = Object.values(schema.entryTypes).sort((a, b) => a.name.localeCompare(b.name));
        const opts: SelectOption[] = sortedTypes.map((et) => ({
            id: et.id,
            label: noTranslationNeeded(et.name),
        }));
        if (extraOption) {
            opts.push({
                id: extraOptionId,
                label: extraOption,
            });
        }

        return opts;
    }, [schema, extraOption]);

    const handleChange = React.useCallback((id: string) => {
        if (id === extraOptionId) onSelectExtraOption?.();
        else onChange?.(id as VNID);
    }, [onSelectExtraOption, onChange]);

    if (schemaError) {
        return (
            <ErrorMessage>
                <FormattedMessage defaultMessage="Unable to load entry types" id="OaBMJc" />
            </ErrorMessage>
        );
    }

    return (
        <SelectBox
            value={props.value}
            options={options}
            readOnly={props.readOnly}
            onChange={handleChange}
        />
    );
};
