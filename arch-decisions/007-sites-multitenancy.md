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

Vertex Framework uses "shortIds" that are up to 32 characters long. In order to support multi-tenancy, Neolace sites use shortIds that are prefixes with a **site code**. The site code is a 4 character code using the 62 alphanumeric characters (0-9, a-z, A-Z), so a site code may look like `AB3x`.

Example:

* A TechNotes Entry has "ID" of `t-wind-turbine-rotor-r4-spxt` (this is the maximum length allowed)
* The site code for TechNotes is `TNDB`
* In the gaph database (vertex framework), it gets stored as shortId `TNDBt-wind-turbine-rotor-r4-spxt` (this is 32 characters long)

The site code cannot start with `z`, to allow for future expansion. With these restrictions, each Neolace Realm can support 61*62*62*62 = 14,538,008 Sites.

**The `shortId` with the site code prefix is considered purely internal** (to give each Site a separate namespace for identifiers), so only the `id` (without the site code prefix) and `uuid` fields are exposed via the API.
