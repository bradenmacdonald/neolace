# Neolace

Neolace is the software that powers [TechNotes](https://www.technotes.org/) and other knowledge bases.

Its key features are:

* Built around the concept of an `Entry`.
  * Entries have properties ("Falcon 9 FT" has a height of "70m") and relationships ("Falcon 9 FT" is a type of "Rocket").
  * Entries have a type, which defines the schema for the entry (what properties and relationships it can/must have)
  * Entries, depending on their type, can have an article text, like a wiki article.
* Entry relationships are semantically meaningful (the system understands that if "Falcon 9 FT" is a rocket, then anything that's true of all rockets is true of "Falcon 9 FT")
* Changes to the content go through a change review process, like pull requests on GitHub.
