#!/bin/sh
cd "${0%/*}"  # Always work from the directory that this script is in.
# Create/update the site and its configuration
../../neolace-admin/neolace-admin.ts import-site-config bricksdb ./site.yaml
# Import the schema
../../neolace-admin/neolace-admin.ts sync-schema bricksdb < ./schema.yaml
