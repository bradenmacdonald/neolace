# Architecture/Decisions: Graph Data

All Neolace data is stored in the Neo4j graph database.

* The highly interconnected datasets that Neolace is designed for are most naturally represented as a graph.
* Neo4j is the only production graph database that fully supports Cypher, which is a very nice query language to work with.
* Neo4j is a mature technology trusted at enterprise scale. (TBD: how well can it handle the eventually _huge_ datasets we'll have?)

## Vertex Framework

Neolace interacts with Neo4j via an intermediary framework called Vertex Framework.

All data is represented as either a node in the graph or a relationship between nodes. Neolace (and Vertex Framework) use only strongly typed nodes, which are called "VNodes". Each type of node (each VNodeType) has a label (e.g. `Entry`), a schema (set of allowed/required properties and relationships), and validation (arbitrary code to check constraints).

Every VNode ("object") is identified by a UUID.

* Neo4j node IDs are meant for internal use only and are not suitable for this purpose (they can be recycled etc.)
* UUIDs allow the client to generate its own ID in advance of writing to the database, which can be handy for e.g. offline edits

Most VNodes are also identified by a `shortId`, which is a short slug-like string such as `user-bob` or `boeing-747`. The "current" `shortId` of a VNode may be changed (e.g. a user changing their username, or an article changing its URL slug), but previously used `shortId`s will continue to work and point to the same VNode. This is considered important for the Neolace use case, where shortIds will be a key part of URLs and links between articles/entries.

For details on VNodes and Vertex Framework, see the Vertex Framework documentation.

When a VNode is "deleted", its labels are changed, e.g. from `:Entry:VNode` to `:Entry:DeletedVNode`. This preserves data and relationships and makes code for un-deleting/restoring nodes simpler.

## Reading Data

Any code in the application is welcome to read from the database at any time, and use any methods to query the nodes and relationships in the database.

## Writing/Mutating Data: Actions

A migrations framework is used to define the database schema and apply some occasional data migrations. Other than that, **all changes (writes) to the database are done via "Actions"**. An Action is a mutation to the database such as "Create User", "Edit Article", etc.

* This "Actions" framework is an instance of the "command pattern". It provides consistency (all mutations happen via the same mechanism), auditability, history, and reversability.

Each Action tracks carefully which VNodes it modifies, and then validation of each modified VNode is done before the write transaction is committed. Every Action successfully applied to the graph is itself a VNode, written into the graph, with a `MODIFIED` relationship pointing to each VNode it created, modified, or deleted.

* This provides a complete change history of every VNode and its relationships.
* This provides fairly strong schema enforcement which Neo4j otherwise does not support (although changes to the validation schema do not apply retroactively, and it relies on actions accurately declaring which VhNodes they have modified).

Actions can generally be "inverted" to create a new Action that undoes the original action. This, in combination with the Action log/history, allows auditing and reverting changes to the graph as needed.
