# Neolace Frontend

This is the frontend for Neolace.

In a development environment, once the server is running, you can view examples at:

* http://local.neolace.net:5555/
* http://technotes.local.neolace.net:5555/
* http://plantdb.local.neolace.net:5555/

The Neolace frontend is built using:

* [Next.js](https://nextjs.org/) - React-based frontend framework
* [Tailwind](https://tailwindcss.com/) - CSS framework

The frontend uses **Server-Side Rendering** (SSR) so that most pages are completely rendered to HTML on the server side before being send to the user's browser. The server-side rendering code is intentionally always user-agnostic (it doesn't know if the user is logged in nor who they are); that means that if the user is in fact logged in, once the browser loads the page, some additional loading and rendering needs to be done to display any user-specific content such as logged-in status, avatar, or private tools/content.

## Internationalization (i18n)

Internationalization is done using `react-intl`. To update translation files, you need to run `npm run i18n`.
