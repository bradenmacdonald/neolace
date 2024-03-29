/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Vertex } from "neolace/deps/vertex-framework.ts";
// core
import { Group } from "neolace/core/permissions/Group.ts";
import { Site } from "neolace/core/Site.ts";
import { BotUser, HumanUser, User } from "neolace/core/User.ts";
// core/edit
import { Connection } from "./edit/Connection.ts";
import { Draft, DraftEdit } from "neolace/core/edit/Draft.ts";
import { AppliedEdit } from "neolace/core/edit/AppliedEdit.ts";
import { EditSource, SystemSource } from "./edit/EditSource.ts";
import { TempFile } from "./edit/TempFile.ts";
// core/entry
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
// core/entry/features
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { features as allFeatures } from "neolace/core/entry/features/all-features.ts";
// core/objstore
import { DataFile } from "neolace/core/objstore/DataFile.ts";
// core/schema
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { getPlugins } from "neolace/plugins/loader.ts";

export function registerVNodeTypes(graph: Vertex) {
    graph.registerVNodeTypes([
        // core
        Group,
        User,
        HumanUser,
        BotUser,
        Site,
        // core/edit
        AppliedEdit,
        Connection,
        DraftEdit,
        Draft,
        EditSource,
        SystemSource,
        TempFile,
        // core/entry
        Entry,
        PropertyFact,
        // core/entry/features
        EnabledFeature,
        EntryFeatureData,
        // Specific features get enabled below
        // core/objstore
        DataFile,
        // core/schema
        EntryType,
        Property,
    ]);

    for (const feature of allFeatures) {
        graph.registerVNodeTypes([
            feature.configClass,
            feature.dataClass,
        ]);
    }
}

// And register VNodes belonging to any plugins:
export async function registerPluginVNodeTypes(graph: Vertex) {
    for (const plugin of await getPlugins()) {
        if (plugin.dataVNodeClasses) {
            graph.registerVNodeTypes(plugin.dataVNodeClasses);
        }
    }
}
