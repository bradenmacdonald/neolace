#!/bin/sh
rm -rf ./temp-export
../../neolace-app/neolace-api/neolace-admin.ts export docs temp-export
rm -rf ./explanation ./guide ./image ./reference ./term ./tutorial
mv -f temp-export/* .
rm -rf ./temp-export
