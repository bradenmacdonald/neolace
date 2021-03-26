# TechNotes Coding Standards

TechNotes is entirely written in TypeScript.

* TypeScript is a modern, strongly-typed language that is enjoyable to work with.
* TypeScript code can be shared between the backend and frontend.

External dependencies should be kept to a minimum.

* Code with fewer dependencies often installs, compiles, and runs faster. For example, this application uses a very modern version of TypeScript and Node.js, so there is absolutely no need for `babel` or polyfills; any dependencies that use/install those are inefficient.
* We want to avoid something like the infamous NPM `left-pad` incident. There is no reason to introduce reliance on a random third party for trivial things; just re-use their code directly (in compliance with its licensing obviously).
* This applies more to full dependencies than to development depenencies, but does apply to both.

Code should be organized based on component/subject rather than type.

Good:

```text
techdb/
techdb/technology.ts
techdb/technology.test.ts
assets/image.ts
assets/image.test.ts
```

Avoid:

```text
models/techdb.ts
models/assets.ts
actions/techdb.ts
tests/techdb/models.ts
tests/techdb/actions.ts
tests/actions/models.ts
```
  
Unit tests use [Intern](https://theintern.io/) and should be alongside the code that they test.

* Intern was chosen because it has a somewhat less-horrible number of dependencies than alternatives like Jest, tap, etc., and because it's fast and flexible, with good support for TypeScript.
* Placing the tests alongside the code makes test code easier to find, and easier to update alongside the code itself.
