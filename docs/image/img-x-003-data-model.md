---
name: Neolace Graph Data Model
id: _5JAehDLtjWX9NPENgEQYWL
description: A diagram showing the high-level [data model of Neolace](/entry/x-003-graph-data-model).
image: img-x-003-data-model.img.png
# Generate this with:
# 
# CALL db.schema.visualization() YIELD nodes, relationships
# UNWIND nodes AS n
# WITH relationships, n, apoc.any.properties(n).name AS nName
# WITH relationships, n, nName WHERE NOT nName IN ["VNode", "Action", "EntryFeatureData", "EnabledFeature", "Migration", "SlugId", "SearchPluginIndexConfig", "Human", "Bot"]
# RETURN relationships, collect(n) AS nodes
---
