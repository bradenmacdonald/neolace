# Neolace SDK

This folder contains the **Neolace SDK** (Software Development Kit), which
provides:

1. TypeScript data types for all of the important data structures used by the
   Neolace APIs (REST API, Plugin API, internal API).
2. A TypeScript API client that can be used to easily make requests from the
   Neolace REST API. See [src/client.ts](src/client.ts).

The SDK is used by the Neolace Backend, Neolace Frontend, neolace-admin script,
and plugins.

Many of the data types are defined using
[computed-types](https://github.com/neuledge/computed-types) which allows us to
validate them at either runtime or compile time.
