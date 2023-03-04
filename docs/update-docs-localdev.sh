#!/bin/sh

# Note: to update _just_ the schema, run:
# ../../neolace-app/neolace-sdk/neolace-admin.ts sync-schema docs < ./schema.yaml

# This will update schema and content:
../../neolace-app/neolace-sdk/neolace-admin.ts erase-content docs --skip-prompt-and-dangerously-delete
../../neolace-app/neolace-sdk/neolace-admin.ts import docs .
