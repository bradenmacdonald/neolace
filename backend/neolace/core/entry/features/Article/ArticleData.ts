/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as check from "neolace/deps/computed-types.ts";
import { Field } from "neolace/deps/vertex-framework.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";

/**
 * If an EntryType has the Article Feature enabled, then it has this node which contains a [long] markdown-formatted
 * article.
 */
export class ArticleData extends EntryFeatureData {
    static label = "ArticleData";
    static properties = {
        ...EntryFeatureData.properties,
        // The markdown text of the article
        articleContent: Field.String.Check(check.string.max(10_000_000)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

    static derivedProperties = this.hasDerivedProperties({});
}
