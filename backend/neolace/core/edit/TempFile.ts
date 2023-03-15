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
import { User } from "neolace/core/User.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";

/**
 * A TempFile is a file uploaded by a user to our object storage, before it has been assigned to a particular use case.
 * Later it can be assigned to an entry (e.g. an image entry), a site logo, or anything else.
 *
 * The only expected use case for this is for creating edits that involve files, either via a Draft or a Connection.
 *
 * Once a TempFile has been uploaded, knowing its ID is sufficient to access it and read its data. Once the associated
 * edit has been committed, the TempFile should be deleted (though the underlying DataFile remains with a new owner.)
 *
 * From time to time, old TempFiles will be deleted and if the underlying DataFile isn't used elsewhere, the data will
 * be deleted from object storage too.
 */
export class TempFile extends VNodeType {
    static readonly label = "TempFile";

    static readonly properties = {
        ...VNodeType.properties,
        timestamp: Field.DateTime,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_DATA: {
            to: [DataFile],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        UPLOADED_BY: {
            to: [User],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        dataFile: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.HAS_DATA}]->(@target:${DataFile})`,
            target: DataFile,
        },
    });
}
