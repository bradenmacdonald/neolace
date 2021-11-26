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

## Property Type

Every property has a **type**: it either represents a **value** or a
**relationship**.

A value can be anything defined by a lookup expression, such as a number, a
string, a list of strings, or even a list of entries.

If it is a relationship type, it can be further specified as an **IS A**
(subclass of or instance of or child of) relationship or a **RELATES TO**
relationship.
* IS A relationships define "inheritance", where some properties set on the
  ancestor entries can be inherited by their descendant entries. For example,
  if a Tesla Model 3 IS An electric car, and an electric car IS a car, and a car
  HAS A steering wheel, then the Tesla Model 3 HAS A steering wheel too, because
  it inherits that relationship from its ancestor entry "car".
* Any other relationship is a **RELATES TO** relationship.

Note: Automatic inverse relationships are a special type of **value property**.
They are not considered relationships themselves and won't appear on graphs.

## Property Mode

A property can be required, recommended, optional, or auto. If it is Auto, it
cannot be edited manually, and is instead automatically computed using a lookup
expression. Relationship properties cannot be "Auto".

## Property Inheritance

Properties can be marked as "inheritable." If they are marked as such, any entry
which does not have a value(s) for a particular property will be shown to have
the value(s) set on the nearest parent entry.

* IS A relationships are always implicitly inherited, and also define what
  entries are considered parents/ancestors.
* Other relationships and values may or may not be inherited depending on
  the property configuration.

When inheritance is enabled for a property it works like this: if one or more
values are set on an entry, only that value(s) is used as the property value for
that entry. If no value is set, the nearest ancestor which has a value set is
found, and then that ancestor's value is used.

Slots: Some properties may enable "slots" (generally "HAS PART" relationships).
In this case, for each "slot", the nearest ancestor with a value(s) set for that
slot is used.

For example, consider a schema with only two relationships, "IS CHILD OF" and
"HAS GENE", where the "HAS GENE" relationship is using slots:
- Grandfather
  -> has gene "blue eye" in slot "eye color"
  -> has gene "left handded" in slot "handedness"
- Father
  -> has gene "brown eye" in slot "eye color"
  -> (inherits gene "left handded" in slot "handedness")
- Son
  -> (inherits gene "brown eye") in slot "eye color"
  -> (inherits gene "left handded" in slot "handedness")

## Open Questions

Do we want a way to define or enforce property cardinality (e.g. only allow a
single value, or require that all values are unique or not)?

How do we design the "update property value" actions to work well and reduce
conflicts?
