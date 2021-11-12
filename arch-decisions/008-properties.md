# Properties

A neolace knowledge base is made up of Entries, which adhere to a Schema.

Data associated with each entry is of three types: **content**,
**property values**, and **relationships**.

**Content** is simply the text content of the article(s) about that entry (if
any) or in the case of image entries, content is the image itself, and so on.
Some entries may not have any content (in particular, property entries do not
have content.)

**Property values** are simple, structured data values related to an entry. For
example, a plant database might have "Scientific name" as a property and an
entry on "Ponderosa Pine" would have *pinus ponderosa* as the property value.

Property values can be lookup expressions, which means their value can be
computed based on other data in the knowledge base, including other property
values.

Property values can be attached to an entry or to an entry type.

**Relationships** are a special type of property value that connects one entry
to another. Relationships are directional, which means that saying "[a car] is
[a motor vehicle]" is different than saying "[a motor vehicle] is [a car]"

More examples:

* "Electric car" (Entry) "is a" (relationship property) "car" (Entry)  
  <small>(There is an "is a" relationship from the "Electric car" entry to the "Car"
    entry)</small>
* "Tesla Model 3 (2022)" (Entry) has "top speed" (Property) "320 km/h" (Property Value)
* "Electric car" (Entry) shows "maximum range: 650 km" (property value, computed
  using a lookup expression based on the "range" value property values of all
  other "electric" car entries in the database)

## Facts

Internally in Neolace, whenever a property value is set, a `PropertyFact` is
created.
