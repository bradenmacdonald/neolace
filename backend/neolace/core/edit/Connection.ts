import * as check from "neolace/deps/computed-types.ts";
import { C, DerivedProperty, Field, VirtualPropType, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Site, siteCodeLength } from "neolace/core/Site.ts";
import { EditSource } from "./EditSource.ts";

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
    static readonly slugIdPrefix = "connection-";

    static readonly properties = {
        ...VNodeType.properties,
        /** An ID for this connection. Format is: "connection-" + site prefix + the actual ID. */
        slugId: Field.Slug,
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

    static derivedProperties = this.hasDerivedProperties({
        friendlyId,
    });
}

/**
 * The site-specific ID for this connection.
 * A property that provides the slugId without its prefixes.
 * See arch-decisions/007-sites-multitenancy for details.
 */
export function friendlyId(): DerivedProperty<string> {
    return DerivedProperty.make(
        Entry,
        (e) => e.slugId,
        (e) => e.slugId.substring(0, Connection.slugIdPrefix.length + siteCodeLength),
    );
}
