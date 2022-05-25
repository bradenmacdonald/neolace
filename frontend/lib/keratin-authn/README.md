This folder contains a customized version of Keratin AuthN that allows users to
login via one subdomain (e.g. home.local.neolace.net) and be logged in to all
other subdomains (e.g. plantdb.local.neolace.net)

The exact changes can be seen here:
https://github.com/keratin/authn-js/compare/master...bradenmacdonald:neolace

Since we are planning to replace keratin-authn with Ory Kratos, I haven't
bothered upstreaming these changes or publishing our version on npm.
