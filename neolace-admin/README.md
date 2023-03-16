# Neolace Admin Tool

This command-line tool can perform various administration commands on a local
development environment, or on a remote production instance of Neolace.

Run `./neolace-admin.ts` without any arguments for usage instructions.

To connect to a local development environment, no special setup is needed.

To connect to a remote Neolace Realm, you will need either a regular user's API
key or the System API Key, which grants full permission to do anything.

Set the required environment variables like this:
```sh
export NEOLACE_API_KEY=SYS_KEY_ABCDEFGHIJKLMNOP
export NEOLACE_API_ENDPOINT=https://api.neolace.io
```
