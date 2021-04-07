# MDT: Markdown for TechNotes

Neolace sites contains many "entries" and "articles" which support rich text descriptions and content. The rich text descriptions and content are authored and represented using "MDT" (MarkDown for Technotes), which is a superset of [CommonMark](https://commonmark.org/) (markdown), with additional Neolace features added.

Refer to the `technotes-mdt` documentation for details.

## Backend does not render HTML

The Neolace backend does not render MDT to HTML; TechNotes backend APIs always return only MDT. It is up to the frontend/client to render the MDT to HTML if it wishes.

## Backend does parse MDT and cache "references"

However, the Neolace backend does parse MDT, and can extract a list of "References" - any articles linked within the MDT, any images references, any datasets queried, etc. By caching the "References" for each piece of MDT content on the server, the backend can efficiently serve clients both the MDT source code and the requisite data to render that (e.g. put a title="..." attribute on every link, with the target article's full title).
