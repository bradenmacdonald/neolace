import { Vertex } from "neolace/deps/vertex-framework.ts";
// core
import { Group } from "neolace/core/Group.ts";
import { Site } from "neolace/core/Site.ts";
import { BotUser, HumanUser, User } from "neolace/core/User.ts";
// core/edit
import { Draft, DraftEdit } from "neolace/core/edit/Draft.ts";
// core/entry
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
// core/entry/features
import { EnabledFeature } from "neolace/core/entry/features/EnabledFeature.ts";
import { EntryFeatureData } from "neolace/core/entry/features/EntryFeatureData.ts";
import { UseAsPropertyEnabled } from "neolace/core/entry/features/UseAsProperty/UseAsPropertyEnabled.ts";
import { UseAsPropertyData } from "neolace/core/entry/features/UseAsProperty/UseAsPropertyData.ts";
// core/schema
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";

export function registerVNodeTypes(graph: Vertex) {
    graph.registerVNodeTypes([
        // core
        Group,
        User,
        HumanUser,
        BotUser,
        Site,
        // core/edit
        DraftEdit,
        Draft,
        // core/entry
        Entry,
        PropertyFact,
        RelationshipFact,
        // core/entry/features
        EnabledFeature,
        EntryFeatureData,
        UseAsPropertyEnabled,
        UseAsPropertyData,
        // core/schema
        EntryType,
        RelationshipType,
        SimplePropertyValue,
    ]);
}
