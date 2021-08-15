# Facts

A neolace knowledge base is made up of Entries, which adhere to a Schema.

Data associated with each entry comes in two types: content and facts. Content
is simply the text content of the article(s) about that entry (if any) or in the
case of image entries, content is the image itself, and so on.

Facts are simple property values or relationships about an entry. For example:

    Fact: "Electric car" (Entry) "is a" (relationship fact) "car" (Entry)

    Fact: "Tesla Model 3 (2022)" (Entry) "top speed is" (property fact) "320 km/h" (Value)

## Querying Facts

Facts are stored as separate VNodes, and are "owned" by a particular entry in
the database, which may not be part of the fact. For example, a DataTable entry
may contain a huge number of facts about related entries, but none of those
facts are about the datatable itself.

## Fact inheritance

Facts are inherited from ancestor entries, and some entries may also display
facts that are computed based on all descendants of an entry (e.g. the
"electric car" article may show the range of "battery capacity" values for all
electric cars currently in production).

The cypher code for getting a list of ancestors based on facts:

    MATCH (entry:Entry:VNode {id: $id})
    CALL apoc.path.expandConfig(entry, {
        sequence: ">VNode,HAS_REL_FACT>,VNode,IS_A>",
        minLevel: 1,
        maxLevel: 50
    })
    YIELD path
    WITH DISTINCT entry, length(path)/2 AS distance, last(nodes(path)) AS parent
    WITH entry, collect({entry: parent, distance: distance}) AS parents
    WITH [{entry: entry, distance: 0}] + parents AS entries
    RETURN entries

And then to get the facts from that:

    UNWIND entries AS e
    WITH e.entry AS entry, e.distance AS distance
    MATCH (entry)-[:HAS_REL_FACT]->(fact:VNode)-[:IS_A|HAS_A|RELATES_TO|DEPENDS_ON]->(toEntry:VNode), (fact)-[:IS_OF_REL_TYPE]->(relType:VNode)
    RETURN entry.id, distance, properties(fact), toEntry.id, relType.id
