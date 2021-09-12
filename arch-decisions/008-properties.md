# Properties

A neolace knowledge base is made up of Entries, which adhere to a Schema.

Data associated with each entry is of three types: **content**,
**relationships** and **property values**.

**Content** is simply the text content of the article(s) about that entry (if
any) or in the case of image entries, content is the image itself, and so on.
Some entries may not have any content (in particular, property entries do not
have content.)

**Relationships** are the relationships between entries. Each relationship is of
a specific relationship type, and the possible relationship types for each entry
are defined by the Schema.

**Property values** are simple, structured data values related to an entry. For
example, a plant database might have "Scientific name" as a property and an
entry on "Ponderosa Pine" would have *pinus ponderosa* as the property value.

Property values can be lookup expressions, which means their value can be
computed based on other data in the knowledge base, including other property
values.

**Properties** themselves are entries of a type defined in the schema, so when
an entry defines a property value, it is a special type of relationship between
two entries (continuing the example, the "*pinus ponderosa*" property value is a
special relationship between the "Ponderosa Pine" plant entry and the
"Scientific name" property entry.)

The schema defines what properties can be associated with each entry type.

More examples:

* "Electric car" (Entry) "is a" (relationship) "car" (Entry)  
  <small>(There is an "is a" relationship from the "Electric car" entry to the "Car"
    entry)</small>
* "Tesla Model 3 (2022)" (Entry) has "top speed" (Property Entry) "320 km/h" (Property Value)
* "Electric car" (Entry) shows "maximum range: 650 km" (property value, computed
  using a lookup expression based on the "range" value properties of all other "electric" car entries in the database)

## Fact

Internally in Neolace, whenever a relationship property is set on an entry, a
`RelationshipFact` is created, and whenever a property value is set, a
`PropertyFact` is created.
