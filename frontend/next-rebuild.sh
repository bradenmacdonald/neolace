#!/bin/sh
# Re-build the site with new environment variables.
# This only works once, because it's assumed to be run at the startup of an immutable docker container image.
# See next-prebuild.sh for more of an explanation of this file.

echo "Rebuilding compiled next.js app with current configuration..."

# First build a list of the files we need to change.
FILES_TO_CHANGE=$(grep -rl REPLACE_THIS_VALUE__ .next)

# Note that these sed commands won't work on OS X but work fine on Linux
echo $FILES_TO_CHANGE | xargs sed -i "s^REPLACE_THIS_VALUE__NEXT_PUBLIC_API_SERVER_URL__^$NEXT_PUBLIC_API_SERVER_URL^g"
echo $FILES_TO_CHANGE | xargs sed -i "s^REPLACE_THIS_VALUE__NEXT_PUBLIC_API_SERVER_INTERNAL_URL__^$NEXT_PUBLIC_API_SERVER_INTERNAL_URL^g"
echo $FILES_TO_CHANGE | xargs sed -i "s^REPLACE_THIS_VALUE__NEXT_PUBLIC_AUTHN_URL__^$NEXT_PUBLIC_AUTHN_URL^g"
echo $FILES_TO_CHANGE | xargs sed -i "s^REPLACE_THIS_VALUE__NEXT_PUBLIC_AUTHN_COOKIE_DOMAIN__^$NEXT_PUBLIC_AUTHN_COOKIE_DOMAIN^g"
echo $FILES_TO_CHANGE | xargs sed -i "s^REPLACE_THIS_VALUE__NEXT_PUBLIC_IMGPROXY_ENABLED__^$NEXT_PUBLIC_IMGPROXY_ENABLED^g"

echo "Configuration rebuilt."
