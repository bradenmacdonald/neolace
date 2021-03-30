# Neolace TypeScript API Client

For now, in lieu of an auto-generated OpenAPI spec, Neolace provides a hand-authored TypeScript API Client library. The reasons for this are:

* Allows better specification of types than is possible through OpenAPI
* Creates simpler and cleaner TypeScript code
* The API client's types can be used on the API server itself, for compile-time validation
* An OpenAPI spec can always be added in the future.

The API follows some specific conventions:

* `null` is always used to represent a non-value (a value that is known to not be set), even for string types. The reason for this is that a string field with type `string` doesn't indicate if an empty string is valid or not, but a string field with type `string|null` clearly indicates that the value may sometimes be not set.
  * This is also compatible with how the Neo4j JavaScript client works.
* If a value is excluded from the response, so that it is not known what its value is or whether it has a value, that property will be absent or `undefined`, which are considered equivalent.
