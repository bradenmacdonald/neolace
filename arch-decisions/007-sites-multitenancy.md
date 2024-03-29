# Neolace Sites & Multi-tenancy

Setting up an installation of Neolace and its underlying Neo4j database is a non-trivial task that requires significant resources and time. So, in order to allow people to get up and running with their own Neolace sites quickly, Neolace is being built with support for multitenancy.

Realm > Site > Entries

Users are shared among all sites on a Realm (an installation of Neolace), and all sites on the Realm share the same underlying Neo4j database.

Sites can be public or private. Any site on a Realm can create relationships to public entries from other sites on the Realm.

Creating relationships to entries from other Realms is not possible, BUT read-only "Mirror Sites" allow replication of a Site from one Realm to another.

For example:

    TechNotes.org (Realm)
        -> TechNotes.org (Site)
            -> TechConcept etc (Entries)
    
    Neolace.com (Realm)
        -> TechNotes mirror (read-only mirror Site)
        -> Braden's Engineering Arcana (private Site, can reference entries from TechNotes mirror)
        -> Janet's recipes (Site)
            -> Recipes (Entries)

## Identifiers

There are (at least) three types of identifiers used in Neolace:

* `id` - (almost) every node in the database has a VNID (a short string like `_5o1X44sypzAwEEAgnrtl1N`) as its primary key, in the `id` property. This is built in to Vertex Framework.
   - these VNIDs are permanent
   - these VNIDs are globally unique
   - generally these VNIDs are internal to Neolace, but some are exposed via its APIs. For example, the VNID of Entries is exposed via the API, but not those of Sites, Drafts, or users.
* `key` - a "key" is a string ID like `home` that is used to identify Entries, Entry Types, Properties, and other entities.
   - keys are site-specific (so two different sites on the same realm can have different entries with the same key)
   - keys can sometimes be changed (e.g. the key of Entries can be changed)
   - For users, the key is called `username`.
* `num` - a numeric identifier used for some entities like Drafts
   - these numbers increment sequentially (1, 2, 3, 4...) and are permanent (cannot be changed)
   - these numbers are site-specific

Because of how Neo4j unique constraints work, any node type that uses a site-specific `key` or `num` must have a property called `siteNamespace` which is set to the VNID of the associated Site. (Even though that makes the data less normalized, as the Site can be determined through relationships.) That way, a unique index can be declared on both fields. When looking up such a node, it's necessary to specify both the `siteNamespace` property and the `key` or `num` values, to ensure that the unique index is used.
