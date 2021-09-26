# Lookups

A **Lookup** is a query of the data in a Neolace knowledge base, which results in
a **value**. Lookups can be used to insert calculated values into article text (to
keep the article always up to date automatically), and are also used to define
some property values.

Lookups are created by writing a **lookup expression**, such as

    this.property(BIRTH_DATE)

which when evaluated results in a value (in this example, the birth date of the
current Person entry.)

**Example 1**:

The intent

> "the article 'electric car' should show all the parts of an electric car"

could be edited in the UI as

> Show [*] entries that [this entry and its ancestors] set as [HAS_PARTS]

and defined as a property value attached to the "electric car" entry, with this lookup expression:

    this.andAncestors().related(via=HAS_PARTS, direction="from")

**Example 2**:

The intent

> "Each article should have a link to related images"

could be edited in the UI as

> Show [Image] entries that are [RELATED_TO] [this entry and its descendants]

and defined as a simple property value with this lookup expression:

    this.andDescendants().related(via=RELATED_TO).filter(type="Image")

Rules of Lookup Expressions:

1. There are no statements (for, while, if, etc.), just expressions. Everything
   is just an expression that evaluates to a value.

2. Functions are called like `functionName(arg)` or `arg.functionName()` which
   are equivalent. The first argument to a function is not named, but all other
   arguments must be named. For example:
   `convertToRecord(data, simpleMode=true, ignoreErrors=true)`
   or
   `data.convertToRecord(simpleMode=true, ignoreErrors=true)`

3. Some values have attributes, like `name` in `entry("s-ponderosa-pine").name`

   Such attributes are never methods in the object oriented sense, however one
   can use the syntactic sugar to call (global) functions in a way that looks
   like a method.

## Value Data Types

Values that result from lookup expressions (and can be used in lookup
expressions) are of the following types:

1. Integer, which can be of arbitrary size (uses JavaScript's `BigInt`)
2. Quantity, a float with an optional unit (e.g. "350.2 g m^2 / s^3") (and an optional error range?)
3. Boolean
4. Null
5. String
6. Date, DateTime, FuzzyDate ([YYYY-MM-DD or YYYY-MM or YYYY] -> [YYYY-MM-DD or YYYY-MM or YYYY])
7. Entry, EntryType, RelationshipType, Property, RelationshipFact, PropertyValue
8. List and Page
9. Range (Holds two Integer, Quantity, Date/DateTime/FuzzyDate of the same type, the second being larger or equal to the first)
