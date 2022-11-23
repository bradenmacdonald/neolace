import * as check from "neolace/deps/computed-types.ts";
import { C, Field, RawRelationships, RawVNode, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { EditSource } from "./EditSource.ts";
import { keyProps, validateSiteNamespace } from "../key.ts";

/**
 * A Connection is a specific source of data that creates/updates/deletes entries on the site.
 *
 * Most commonly, a Connection represents an external database that the Neolace site needs to keep in sync with.
 *
 * Connections are implemented by plugins and apply edits immediately, bypassing Drafts entirely.
 *
 * All Connections are implemented by plugins. A single plugin (like "CSV import") may be used for many different
 * connections on the same site, if they use the same basic mechanism but have different configuration.
 */
export class Connection extends EditSource {
    static readonly label = "Connection";

    static readonly properties = {
        ...VNodeType.properties,
        ...keyProps,
        /** The name of this connection, displayed to users */
        name: Field.String.Check(check.string.min(1).max(1_000)),
        /** The plugin that implements this connection. */
        plugin: Field.Slug,
        /**
         * Configuration of this connection. What this means depends on the plugin.
         * Status (e.g. last time import was run, etc.) should not be saved into this field but into separate,
         * special-purpose nodes.
         */
        config: Field.JsonObjString,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        FOR_SITE: {
            to: [Site],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            target: Site,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target:${Site})`,
        },
    });

    static override async validate(
        rawNode: RawVNode<typeof this>,
        relationships: RawRelationships[],
    ): Promise<void> {
        // Validate that siteNamespace is correct.
        validateSiteNamespace(this, rawNode, relationships, this.rel.FOR_SITE);
    }
}
