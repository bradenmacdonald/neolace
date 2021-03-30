# TechNotes Content

TechNotes aims to be a massive, specialized, integrated database about technology.

The application design will be shaped by the high-level categories of content:

## Core

* User accounts

## TechDB (Tech Database)

The technology database stores structured data about technology in a graph. The categorization of nodes and relationships is planned to be something like this:

* **Tech Concept/Construct**: A Device, system (set of devices), or software construct that can be designed, created, and used - e.g. "smartphone", "solar panel", "wing nut", "power plant" (system), "transportation network" (system), "image compression algorithm" (software construct), "data interchange format" (software construct), "video codec" (software construct)
  * IS_A: [Concept {weight}]
  * HAS_PART: [Concept {order, always/sometimes/never}]
  * HAS_FUNCTION: [Process {weight}]
  * HAS_PROPERTY: [Property {value/range, uncertainty}]
  * USES_MATERIAL: [Material {}]
* **Process**: e.g. "welding" (may be a function of a device, or required to build a device), "data compression", "stratospheric aerosol scattering", "chemical vapour deposition", "digital contact tracing"
  * IS_A: [Process {weight}]
* **Design**: a specific design/plan/implementation/algorithm of a Tech Concept, e.g. "555 timer IC", "Hoover Dam", "iPhone 12"; can incude research prototypes, not necessarily only commercially available.
  * IS_A: [Concept {weight}]
  * IS_VERSION_OF: [Design {order}]
  * IS_VARIANT_OF: [Design {order}]
  * HAS_ANTECEDENT: [Design {}]
  * HAS_PART: [Concept {weight}, Design {weight}]
  * HAS_PROPERTY: [Property {value/range, uncertainty}]
  * USES_MATERIAL: [Material {}]
  * USES_PATENT: [Patent {}]
  * COMPLIES_WITH [Standard {}]
  * **Product**: a commercially available instance of a Design. Often there is a 1:1 correlation between product and design (e.g. "iPhone 12"), but not always - e.g. the "555 timer IC" design is sold by many different vendors
    * HAS_DESIGN: [Design {}]
* **Patent**: a patent for a specific process or device
  * RELATES_TO: [Concept {weight}, Process {weight}, Patent {weight}]
  * CITES: [Patent {weight}]
* **Material**: e.g. "304 stainless steel", "gallium arsenide", "carbon fiber", "water"
  * IS_A: [Material {}]
  * HAS_PROPERTY: [Property {value/range, uncertainty}]
  * HAS_PROCESS: [Process {}]
  * HAS_STANDARD: [Standard {}]
* **Property**: Defines measures by which Concepts/Materials/Designs/Processes can be compared and evaluated. e.g. "Date announced", "# of cores", "voltage", "ductility", "Supports Bluetooth Heart Rate Profile"
* **Standard**: e.g. "Bluetooth 5.2", "SAE J1086", "ISO 3506"
  * RELATES_TO: [Concept {weight}, Process {weight}]
* **Dataset**: A data table (think spreadsheets) containing useful data such as product or material specifications
* **Other** "electric power" (science concept), "Open Systems Interconnection model" (model/scheme/framework), "access control list"

## Asset Library

* Images: Used for TechDB entries and articles
* References: PDF copies of source data, such as datasheets, manuals, textbooks, announcements, papers, etc.
* Future: Videos, CAD models, 3D Printer models ?

A future addtional top-level section may be "Articles" with guides, books, case studies, etc.

The Asset Library could arguably be just part of the TechDB, but it's expected that it may at some point hold user-generated content like hobby project models that stand on their own and aren't part of the scope of the Tech Database.

## Examples of how things fit into this scheme

* Turbine, Watch, Engine - **Tech Concept**
* Electricity generation, Electric power transmission - **Process**
* Inconel - **Material**
* Superalloy - **Material**
* Precipitation hardening - **Process**
* Over-the-air updates - **Process**
* Electrical grid - **Tech Concept**
* JPEG - **Design** (and specification) of an image compression algorithm (Concept) that implements image compression (Process)
* JPEG File (Jpeg/Exif, Jpeg/JFIF) - **Design** (and specification) of an image file format (Concept)
* JSON - **Design** (and specification) of a "data interchange format" (concept), specified by various Standards (RFC 8259, ISO/IEC 21778:2017)
* WiFi - **Design** of a wireless network (Concept), specified via protocols (Design+Standard)
* Git - **Design** of a "Distributed Version Control System" (Concept), though it's also a protocol/standard, and a specific implementation
* Linux - **Design** (family) of an "Operating System" (Concept)
* Linux kernel - **Design** of an "Operating System Kernel" (Concept)
* FaceTime - **Design** of a "Video Calling System" ??? (Concept) and VoIP System (Concept)
* Fourier Transform - **Process**
* Open Systems Interconnection model - **Concept**
* Role-Based Access Control - **Concept**

Todo: a way for design properties to apply to a version and all subsequent ones, unless overridden ? Or just copy when creating
