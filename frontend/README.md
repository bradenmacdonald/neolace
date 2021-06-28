# Neolace Frontend

This is the frontend for Neolace

The TechNotes frontend is built using:

* [Next.js](https://nextjs.org/) - React-based frontend framework
* [Bootstrap 4.5](https://getbootstrap.com/) - SCSS toolkit

The frontend uses **Server-Side Rendering** (SSR) so that most pages are completely rendered to HTML on the server side before being send to the user's browser. The server-side rendering code is intentionally always user-agnostic (it doesn't know if the user is logged in nor who they are); that means that if the user is in fact logged in, once the browser loads the page, some additional loading and rendering needs to be done to display any user-specific content such as logged-in status, avatar, or private tools/content.
