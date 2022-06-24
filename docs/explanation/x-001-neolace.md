---
name: 001 Neolace
id: _4ybTbey44SCI9CAE7fAaTb
description: >-
  An overview of Neolace.
---
# Introduction

**Neolace** is a platform for collaboratively building a collection of knowledge. Commons terms for this sort of platform are "knowledge graph", "knowledge base", or "semantic knowledge base", although those terms can also have different meanings.

# Core Features

Every Neolace Site is primarily a collection of **Entries**. Each Entry usually corresponds to knowledge about some "thing" in the real world, but an Entry can also represent a piece of content, like a page of text or an image. The page you are reading right now ({ this }) is an Entry.

Each Entry has **Properties**; for example an entry about "Canada" would state that it has a "Total Area" of "9,984,670 km^2^" - in this case, "Total Area" is the Property and "9,984,670 km^2^" is the Property Value. Property Values can also be relationships; in the Canada example, it could have the "Capital" property with the value "Ottawa, Ontario" where "Ottawa, Ontario" is another entry.

Every Neolace Site has a **Schema**, which determines what Entry Types and Properties are allowed, and how they relate to each other. Every **Entry** is of exactly one **Entry Type**, and its Entry Type determines which Properties it can have. The Entry Type of this Entry you are reading right now is { this.entryType() }.

Each Entry can also have **Content Features**, depending on its Entry Type. Content Features include **Article Text**, **Image**, **Hero Image**, and **Files**. The most important one is Article Text, which gives each entry a long-form article in Markdown format. The text you are reading right now is the Article Text of { this }, because this Entry's Entry Type ({ this.entryType() }) specifies that every Explanation Entry should contain Article Text.

# Neolace is Semantic

Relationship properties between Entries in Neolace can be _meaningful_ ("semantic"), and Neolace can automatically infer facts, properties, and relationships from those meaningful relationships. For example, if you have an Entry for "Car" that says "has 4 wheels" and you have an entry for "Tesla Model S" which says it is a car, then Neolace can tell you that the Tesla Model S has 4 wheels, despite the fact that nobody entered that fact in directly.

# Change Review Process

Neolace has a **change review process**, which mean that any additions or edits to the site must first be reviewed by an editor or authorized user before they are published. This is similar to the "pull requests" feature on GitHub, which revolutionized collaborative software development.

It works like this: first a user clicks "Edit" and makes changes to an Entry. Then, they publish those changes as a **Draft**. The Draft is then reviewed by one or more editors or other users. If they request changes, the original user must make those changes. Once the draft is ready, it is approved and published. Then everyone will see the changes live on the site.

This workflow has a number of advantages:
1. It allows sites to accept contributions from the general public, but still review them for quality or accuracy before publishing.
1. Even for edits from site staff, it provides a built-in workflow for reviewing work before it is published, which is often a requirement.
1. It allows re-organizing many Entries all at once; a single Draft can contain changes to many entries and even to the Site's Schema.

# Connectors

Neolace isn't just designed for humans to use. Everything in Neolace is easily machine-readable. What's more, **Connectors** can be used to import read-only data from other systems. You can connect a Neolace site to other databases, documentation, and more, and it will automatically keep Entries up to date with relevant content from those systems.
