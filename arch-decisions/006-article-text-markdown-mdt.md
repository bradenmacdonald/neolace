# Article Text: Markdown

An "Entry" in Neolace can be a set of properties, a file, and/or an article, but is usually a (rich text) article along with a set of properties. The article text may contain "blocks" such as images, animations, videos, tables, interactives, etc.

We want the system for editing article content to have these properties:

- Edits are made via "drafts" (change requests) which can be long-lived (person A opens a draft with some edit, person B opens a second draft with another edit)
- As much as possible, conficts between edits in different drafts should be resolved automatically rather than via manual conflict resolution
- A full history of changes made to each article is recorded and can be shown
- Users who wish to edit the "source code" of the article (e.g. Markdown source) should be able to do so.
- Specific Entry Types can be given a template, a set of pre-defined headings to (e.g. all "Plant" entries need to have sections entitled "Overview", "Description", and "Range")

## Rejected approach: Slate.js JSON Articles and Operational Transforms

One way to achieve most of the above goals is to represent an article (various text sections and blocks) using the model of Slate.js and making all edits to the article using Slate.js's API which reduces everything to a few fundamental (13? 9?) [operations](https://docs.slatejs.org/v/v0.47/slate-core/operation). Articles could be stored in this JSON data format, and drafts/edits are also saved as a set of JSON "operations". When a draft is applied to an article (analogous to a pull request being merged), any other drafts which haven't yet been merged would have to be transformed. This involves updating each pending operation from the unmerged drafts one at a time by transforming them according to certain rules. (e.g. if "insert 'hello ' at 0" was applied to the article with text "world"), then a pending "insert '!" at 5" operation in the draft would need to be transformed to "insert '!' at 11". This is the essence of "operational transforms", a proven technique for real-time and intermittently offline collaborative editing, used in products like Google Docs.

However, this approach has considerable downsides:

- There is not yet any open source implementation of operational transforms for the 9 (or 13?) fundamental operations in Slate.js, although several people have implemented it independently as closed-source solutions. See https://github.com/ianstormtaylor/slate/issues/259 for details. As there are 9 operations and each must be able to be transformed for any of the other 9 operations, there are 81 transforms to implement.
- The Slate.js API is not stable, and storing both article text and changes in Slate.js format may require very expensive updates in the future if the format changes
- This approach is very tied to Slate.js and does not permit editing a nice "source" version such as Markdown; the "source" is a complex JSON document that's not very human friendly
- This approach is very tied to Slate.js and requires a lot of development before it can be used at all; there is no quick and simple prototype

## Rejected approach: CRDTs

Like OT (operational transforms), Conflict-Free Replicated Datatypes (CRDTs) are a way of representing changes to a document so that they can be applied in any order without conflicts. This has been implemented most effectively in Y.js. CDRTs are a newer technique and have some exciting attributes. However, there are significant downsides such as increased complexity, increased memory use, possibly slower implementations in general. One reason for this is that every "part" of the document needs its own unique ID (essentially every character needs a unique ID, though it can be optimized to be less than that, more like every word or paragraph in some cases).

## Chosen approach: Markdown

Markdown has a number of big advantages for Neolace:

- It's simple and easy to understand
- It's well-known and familiar
- It can be prototyped quickly, as it's similar to plain text and can be edited with a plain text editor
- As a mostly plain-text format, it is very backwards-compatible. The basic structure of the format and its diffs are unlikely to change. [Although note that a project using diff-match-patch for Markdown did change the serialization of the patch format at one point](https://github.com/laurent22/joplin/blob/0e757ad5629da3e800200952171343b31b2c7c90/packages/lib/models/Revision.ts).
- Even when allowing users to edit the "markdown source", we can include quality of life improvements like [rendering article IDs in a friendly way](https://www.slatejs.org/examples/mentions) or [Markdown preview](https://www.slatejs.org/examples/markdown-preview)

The big disadvantage of Markdown is that changes to it must be represented using some kind of "diff" format (like git uses), and there is no way to avoid conflicts in some cases. However, by using [a modern, plain-text optimized diff and patch strategy](https://neil.fraser.name/writing/diff/), we can greatly reduce the occurrence of conflicts and auto-resolve many of them. The huge advantages of Markdown in this case seem to outweigh the significant disadvantage that sometimes manual conflict resolution will be required.

## Details

Specifically, Neolace uses "MDT" (MarkDown for Technotes), which is a superset of [CommonMark](https://commonmark.org/) (markdown), with additional Neolace features added.

Refer to the `technotes-mdt` documentation for details.

**The Neolace backend does not render MDT to HTML**; Neolace backend APIs always return only MDT. It is up to the frontend/client to render the MDT to HTML if it wishes.

However, the Neolace backend does parse MDT, and can extract a list of "References" - any articles linked within the MDT, any images references, any datasets queried, etc. By caching the "References" for each piece of MDT content on the server, the backend can efficiently serve clients both the MDT source code and the requisite data to render that (e.g. put a title="..." attribute on every link, with the target article's full title).
