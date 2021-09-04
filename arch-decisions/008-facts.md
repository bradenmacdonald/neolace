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

## Computed Facts

In addition to relationship facts and property facts, there are "computed facts"
which use the Neolace Query Language (see decision 009) to calculate or format
a value for display.

Computed facts can be attached to / owned by:

- An EntryType (then it will show for all entries of that type)
- An Entry (then it will show on that Entry and all descendants)
- The text content of article entries (also descriptions? relationship notes?)
