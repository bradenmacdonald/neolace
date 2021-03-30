# Neolace Backend

The "backend" is the application which reads and writes the [graph database](./002-graph-data.md) and provides a REST API for interacting with it.

The backend is implemented as a Node.js application written in TypeScript.

* Node.js is stable, production-proven, and performant.
* Deno was explored as an alternative but although its architecture seems better than Node, it's not proven and its ecosystem was way too immature (e.g. no Neo4j, no hapi, etc.)

The backend uses [hapi](https://hapi.dev/) as its web framework.

* hapi has a strong focus on secure, audited code and is the only leading node framework without any external dependencies.
* hapi has minimal overhead.
* hapi is mature and has been proven at enterprise scale.
* hapi integrates well with [Joi](https://joi.dev/).

The backend's API is RESTish, and the schema is strongly typed, versioned, and documented using [OpenAPI](https://www.openapis.org/).

* REST is simple, familiar, and universal
* An OpenAPI spec file allows auto-generated API clients.

For now, there is no GraphQL API.

* We have a strongly typed schema for the REST API already
* REST can do a lot of what GraphQL does, such as filtering by fields
* GraphQL is more complex than REST
* GraphQL allows users to send arbitrary queries which may be expensive, unlike REST API queries which are more well-defined and tuned.

The backend delegates authentication to the [AuthN microservice](https://keratin.tech/).

* This reduces potential for authentication vulnerabilities.
