# Neolace Backend

The "backend" is the application which reads and writes the [graph database](./002-graph-data.md) and provides a REST API for interacting with it.

The backend is implemented as a Deno application written in TypeScript.

The backend uses [Drash](https://drash.land/drash/v2.x/getting-started/introduction) as its web framework.

The backend delegates authentication to the [AuthN microservice](https://keratin.tech/).

* This reduces potential for authentication vulnerabilities.

## REST API

The backend provides a REST API.

The REST API follows some specific conventions:

* Although the platform itself has i18n features, the API is not multilingual; error messages will only be in English, for example. However, every API response should include machine-readable fields (like error codes) that can be easily converted to localized messages by any frontend.
* Field names are `camelCase`
* When the Neolace server wants to indicate that a field has a non-value, that field will be present with a `null` value.
  * This applies to string types as well, and strings will generally use `null` instead of an empty string (`""`) unless there is a very good and well-documented reason to distinguish between `null` and `""`.
  * This makes all the types consistent.
  * One reason for this is that a string field with type `string` doesn't indicate if an empty string is valid or not, but a string field with type `string|null` clearly indicates that the value may sometimes be not set.
* If a field is excluded from the response (or has the value `undefined` when returned by the API client), that field may or may not have a value - the API consumer would have to make another request and explicitly include that field in order to know. In other words, absence of a field never implies that it is `null`.

For now, in lieu of an auto-generated OpenAPI spec, Neolace provides a hand-authored TypeScript API Client library. The reasons for this are:

* Allows better specification of types than is possible through OpenAPI
* Creates simpler and cleaner TypeScript code
* The API client's types can be used on the API server itself, for compile-time validation
* An OpenAPI spec can always be added in the future.

For now, there is no GraphQL API.

* We have a strongly typed schema for the REST API already
* REST can do a lot of what GraphQL does, such as filtering by fields
* GraphQL is more complex than REST
* GraphQL allows users to send arbitrary queries which may be expensive, unlike REST API queries which are more well-defined and tuned.
