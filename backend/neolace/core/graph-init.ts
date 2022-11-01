import { Vertex } from "neolace/deps/vertex-framework.ts";
// core
import { Group } from "neolace/core/permissions/Group.ts";
import { Site } from "neolace/core/Site.ts";
import { BotUser, HumanUser, User } from "neolace/core/User.ts";
// core/edit
import { Draft, DraftEdit, DraftFile } from "neolace/core/edit/Draft.ts";
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
import { AppliedEdit } from "neolace/core/edit/AppliedEdit.ts";

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
        DraftEdit,
        DraftFile,
        Draft,
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
