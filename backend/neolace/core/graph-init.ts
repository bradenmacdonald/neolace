import { Vertex } from "neolace/deps/vertex-framework.ts";

import { Group } from "neolace/core/Group.ts";
import { Site } from "neolace/core/Site.ts";
import { BotUser, HumanUser, User } from "neolace/core/User.ts";
import { Draft, DraftEdit } from "neolace/core/edit/Draft.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";

export function registerVNodeTypes(graph: Vertex) {
    graph.registerVNodeTypes([
        // asset-library
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
        // core/schema
        EntryType,
        RelationshipType,
        SimplePropertyValue,
    ]);
}
