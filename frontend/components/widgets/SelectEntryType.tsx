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
import { FormattedMessage } from "react-intl";
import { VNID } from "neolace-sdk";

import { noTranslationNeeded, TranslatableString } from "components/utils/i18n";
import { useSchema } from "lib/sdk";
import { ErrorMessage } from "./ErrorMessage";
import { SelectBox, SelectOption } from "../form-input/SelectBox";

interface Props {
    /** The entry type key */
    value?: string;
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
            id: et.key,
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
