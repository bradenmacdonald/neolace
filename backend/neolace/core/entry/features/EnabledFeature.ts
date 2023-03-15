/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { RawVNode, VNodeType } from "neolace/deps/vertex-framework.ts";

/**
 * For each EntryType that supports (enables) a given feature (like Article text), that EntryType will have an
 * EnabledFeature node with configuration that affects how the feature works.
 *
 * This is an abstract class.
 */
export class EnabledFeature extends VNodeType {
    static label = "EnabledFeature";
    static properties = {
        ...VNodeType.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties(() => ({}));

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof this>): Promise<void> {
        if (dbObject._labels.length !== 3) {
            throw new Error(
                `Every EnabledFeature VNode should have exactly three labels: VNode, EnabledFeature, and _________Enabled (a specific feature type)`,
            );
        }
    }
}
