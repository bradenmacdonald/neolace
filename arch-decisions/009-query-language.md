# Neolace Query Language

The Neolace Query Language is used to define "computed facts" (lookups?)
whose value is determined by querying the graph database.

Example 1:
    The intent
        "the article 'electric car' should show all the parts of an electric car"
    could be edited in the UI as
        Show [*] entries that [this entry and its ancestors] set as HAS_PARTS
    and defined as a "computed fact" with this NQL query:
        related(andAncestors(this), via=HAS_PARTS)
    or using flow syntax:
        this.andAncestors().related(via=HAS_PARTS)
        (this is just syntactic sugar and is equivalent to the version above)

Example 2:
    The intent
        "Each article should have a link to related images"
    could be edited in the UI as
        Show [Image] entries that are [RELATED_TO] [this entry and its descendants]
    and defined as a "computed fact" with this NQL query:
        filter(related(andDescendants(this), via=RELATED_TO), type="Image")
    or using flow syntax:
        this.andDescendants().related(via=RELATED_TO).filter(type="Image")

Rules of Neolace Query Language:

1. There are no statements (for, while, if, etc.), just expressions. Everything
   is just an expression that evaluates to a value.

2. Functions are called like `functionName(arg)` or `arg.functionName()` which
   are equivalent. The first argument to a function does not need to be named
   (though it can be), but all other arguments must be named. For example:
   `convertToRecord(data, simpleMode=true, ignoreErrors=true)`

3. Some values have attributes, like `name` in `entry("s-ponderosa-pine").name`

   Such attributes are never methods in the object oriented sense, however one
   can use the syntactic sugar to call (global) functions in a way that looks
   like a method.

Basic Data Types:

1. Integer, which can be of arbitrary size (uses JavaScript's BigInt)
2. Quantity, a float with an optional unit (e.g. "350.2 g m^2 / s^3") (and an optional error range?)
3. Boolean
4. Null
5. String
6. Date, DateTime, FuzzyDate ([YYYY-MM-DD or YYYY-MM or YYYY] -> [YYYY-MM-DD or YYYY-MM or YYYY])
7. Entry, EntryType, RelationshipType, Property, RelationshipFact, PropertyValue
8. List
9. Range (Holds two Integer, Quantity, Date/DateTime/FuzzyDate of the same type, the second being larger or equal to the first)
