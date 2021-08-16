# Neolace Query Language

The Neolace Query Language is used to define "computed facts" (neolookups?)
whose value is determined by querying the graph database.

Example 1:
    The intent
        "the article 'electric car' should show all the parts of an electric car"
    could be edited in the UI as
        Show [*] entries that [this entry and its ancestors] set as HAS_PARTS
    and defined as a "computed fact" with this NQL query:
        related(andAncestors(this), toRelType=HAS_PARTS)
    or using flow syntax:
        this.andAncestors().related(toRelType=HAS_PARTS)
        (this is just syntactic sugar and is equivalent to the version above)

Example 2:
    The intent
        "Each article should have a link to related images"
    could be edited in the UI as
        Show [Image] entries that are [RELATED_TO] [this entry and its descendants]
    and defined as a "computed fact" with this NQL query:
        filter(related(descendantsAnd(this), fromRelType=RELATED_TO), type="Image")
    or using flow syntax:
        this.descendandsAnd().related(fromRelType=RELATED_TO).filter(type="Image")

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
