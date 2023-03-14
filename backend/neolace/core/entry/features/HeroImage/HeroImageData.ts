/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";

/**
 * This class is not really used, but we have to define it for consistency with how other "Entry Features" work.
 */
export class HeroImageData extends EntryFeatureData {
    static label = "HeroImageData";
    static properties = {
        ...EntryFeatureData.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));
}
