# Lookups

A **Lookup** is a query of the data in a Neolace knowledge base, which results in
a **value**. Lookups can be used to insert calculated values into article text (to
keep the article always up to date automatically), and are also used to define
some property values.

Lookups are created by writing a **lookup expression**, such as

    this.get(prop=BIRTH_DATE)

which when evaluated results in a value (in this example, the birth date of the
current Person entry.)

**Example 1**:

The intent

> "the article 'electric car' should show all the parts of an electric car"

could be edited in the UI as

> Show [*] entries that [this entry and its ancestors] set as [HAS_PARTS]

and defined as a property value attached to the "electric car" entry, with this lookup expression:

    this.andAncestors().get(prop=HAS_PARTS)

**Example 2**:

The intent

> "Each article should have a link to related images"

could be edited in the UI as

> Show [Image] entries that are [RELATED_TO] [this entry and its descendants]

and defined as a simple property value with this lookup expression:

    this.andDescendants().reverse(prop=prop("related-to")).filter(only=(x.type() = "Image"))

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
2. Quantity, a float with an optional unit (e.g. "350.2 g m^2 / s^3") (preserves number of decimal places)
3. Boolean
4. Null
5. String, which `"can contain {interpolated} {values} or \{not}"`
6. Date, DateTime (TBD: do we want year or fuzzydate?)
7. Entry, EntryType, Property, PropertyValue
8. Page (like a list but may only be a subset of a list; some values may be missing. The total size is always known.)
9. Range (For Integer, Quantity, Date/DateTime values of the same type and units, this holds up to three values: a min, main, and/or max value, which can be used to express things like tolerances e.g. "typ 3.55mm max 4.00mm", uncertainy e.g. "1940-1943?", confidence intervals, or spans e.g. "sold from 2014-2018", or for aerospace "NET 2012-07-15")
10. Transform Expression
11. Type

## Literals

Some types can be referenced as literals:

In each example, `_2uDtUtOWJCL33X7zTAK8dK` is the ID of the object in question.

* Entries: `[[/entry/_2uDtUtOWJCL33X7zTAK8dK]]`
* Properties: `[[/property/_2uDtUtOWJCL33X7zTAK8dK]]`
* Entry Type: `[[/type/_2uDtUtOWJCL33X7zTAK8dK]]`

## Transform Expressions and Conditionals

An "transform expression" is an expression that accepts a value and returns a
new value based on the original value, i.e. is an anonymous function.

A simple transform expression would be `(x -> x.type())` which means "given any
value x, return its type".

Simple transform expressions - examples:
 * `(x -> x.type())` (given any value x, return its type)
 * `(x -> x = 1)` (is x exactly equal to 1?)
 * `(x -> x > 1)` (is x more than 1?)
 * `(x -> x ≥ 0 && x < 10)` (is x greater than or equal to zero but less than 10?)
 * `(x -> x = "yes" or x = "no")` (is x equal to "yes" or "no" ?)
 * `(x -> x in ["a1", "b2", "c3"])` (is x one of the specified strings?)

An example of tarnsforming a value for display:
    `(value -> markdown("[{value}](https://www.wikidata.org/wiki/{value})"))`
