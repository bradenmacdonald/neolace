/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";
import { string } from "neolace/deps/computed-types.ts";

/**
 * If an EntryType has the Files Feature enabled, then its entries can each have one or more files attached to them.
 */
export class FilesData extends EntryFeatureData {
    static label = "FilesData";
    static properties = {
        ...EntryFeatureData.properties,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_DATA: {
            to: [DataFile],
            cardinality: VNodeType.Rel.ToManyUnique,
            properties: {
                // The file name that is displayed to the user when editing the file, e.g. "attachment1.pdf"
                // This is different from the underlying filename on object storage, which is set on the DataFile
                displayFilename: Field.String.Check(string.min(2)),
            },
        },
    });

    static virtualProperties = this.hasVirtualProperties(() => ({
        dataFiles: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[@rel:${this.rel.HAS_DATA}]->(@target:${DataFile})`,
            target: DataFile,
            relationship: this.rel.HAS_DATA,
            defaultOrderBy: "@rel.displayFilename",
        },
    }));
}
