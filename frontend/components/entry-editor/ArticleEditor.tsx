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

import { SDK } from "lib/sdk";
import { Spinner } from "components/widgets/Spinner";
import { AutoControl } from "components/form-input/AutoControl";
import { Form } from "components/form-input/Form";
import { MDTEditor } from "components/form-input/MDTEditor";
import { defineMessage } from "components/utils/i18n";

interface Props {
    entry?: SDK.EditableEntryData;
    addUnsavedEdit: (newEdit: SDK.AnyEdit) => void;
}

/**
 * This widget implements the "Article" tab of the "Edit Entry" page (edit the article content)
 */
export const ArticleEditor: React.FunctionComponent<Props> = ({ entry, addUnsavedEdit }) => {

    const updateEntryArticle = React.useCallback((articleContent: string) => {
        if (!entry) return;
        addUnsavedEdit({ code: SDK.UpdateEntryFeature.code, data: { entryId: entry.id, feature: {
            featureType: "Article",
            articleContent,
        } } });
    }, [entry, addUnsavedEdit]);

    if (!entry) {
        return <Spinner />;
    } else if (!entry.entryType) {
        return (
            <p>
                <FormattedMessage
                    defaultMessage="You need to choose an entry type for this entry before you can set properties."
                    id="SWt2PR"
                />
            </p>
        );
    }

    return (<>
        <Form>
            {/* Description */}
            <AutoControl
                value={entry.features.Article?.articleContent ?? ""}
                onChangeFinished={updateEntryArticle}
                id="article-content"
                label={defineMessage({ defaultMessage: "Article Content", id: "zv9BL0" })}
            >
                <MDTEditor inlineOnly={false} />
            </AutoControl>
        </Form>
    </>);
};
