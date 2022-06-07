import React from "react";
import { FormattedMessage } from "react-intl";
import { VNID } from "neolace-api";

import { noTranslationNeeded } from "components/utils/i18n";
import { useSiteSchema } from "lib/api-client";
import { ErrorMessage } from "./ErrorMessage";
import { SelectBox, SelectOption } from "./SelectBox";

interface Props {
    value?: VNID;
    readOnly?: boolean;
    onChange?: (newEntryType: VNID) => void;
}

/**
 * A select widget for chosing an EntryType
 */
export const SelectEntryType: React.FunctionComponent<Props> = ({ ...props }) => {
    const [schema, schemaError] = useSiteSchema();

    const options: SelectOption[] = React.useMemo(() => {
        if (!schema) {
            return [];
        }
        const sortedTypes = Object.values(schema.entryTypes).sort((a, b) => a.name.localeCompare(b.name));
        return sortedTypes.map((et) => ({
            id: et.id,
            label: noTranslationNeeded(et.name),
        }));
    }, [schema]);

    if (schemaError) {
        return (
            <ErrorMessage>
                <FormattedMessage defaultMessage="Unable to load entry types" id="OaBMJc" />
            </ErrorMessage>
        );
    }

    return <SelectBox 
        value={props.value}
        options={options}
        readOnly={props.readOnly}
        onChange={props.onChange as (id: string) => void}
    />;
};
