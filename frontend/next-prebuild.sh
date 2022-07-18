#!/bin/sh
# The problem: Next.js environment variables have to be set at build time, and builds are slow and use lots of memory
# (~1GB). We want our container to start up quickly and use the normal non-build memory level (~200MB). But we also want
# to have a standard frontend container image that can be used for many different deployments, not requiring a custom
# image to be built for each deployment.

# The solution: this script. We set *dummy* variables at build time, then at runtime we use find-and-replace in the
# built code to replace those with the current values.


export NEXT_PUBLIC_API_SERVER_URL=REPLACE_THIS_VALUE__NEXT_PUBLIC_API_SERVER_URL__
export NEXT_PUBLIC_API_SERVER_INTERNAL_URL=REPLACE_THIS_VALUE__NEXT_PUBLIC_API_SERVER_INTERNAL_URL__
export NEXT_PUBLIC_AUTHN_URL=REPLACE_THIS_VALUE__NEXT_PUBLIC_AUTHN_URL__
export NEXT_PUBLIC_AUTHN_COOKIE_DOMAIN=REPLACE_THIS_VALUE__NEXT_PUBLIC_AUTHN_COOKIE_DOMAIN__
export NEXT_PUBLIC_IMGPROXY_ENABLED=REPLACE_THIS_VALUE__NEXT_PUBLIC_IMGPROXY_ENABLED__
npm run build
