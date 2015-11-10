# FHIR.js
Node.JS library for DSTU1 and DSTU2, for serializing/deserializing FHIR resources between JS/JSON and XML using various node.js XML libraries, and for validating FHIR JSON and XML 

![Build Status](https://travis-ci.org/lantanagroup/FHIR.js.svg?branch=master)

# Dependencies
* q 1.4.1
* xml2js 0.4.9
* xmlbuilder 2.6.4
* libxmljs 0.14.3

# Installation
```
npm install fhir
```

# Test
```
npm test
```

# Documentation
API documentation can be found at http://lantanagroup.github.io/FHIR.js/

# Implementation Notes
* FHIR DSTU2 is *now supported*
* Feeds and resources are both supported for DSTU1. There is no need to do anything different for converting feeds vs. resources. The library will automatically detect what should be produced based on the resourceType of the JS object passed, or based on the root element of the XML.
* libxmljs is used to validate XML against the FHIR schemas
* xml2js is used to parse XML and create JS
* xmlbuilder is used to create XML from JS
* FHIR profiles (within the "profiles" directory) are used to determine whether properties should be arrays. The profiles are loaded into memory whenever an instance of the FHIR module is created. This could be improved to reduce I/O operations...
** As part of publishing, all FHIR JSON profiles are merged together into a single array that is used by require() within FHIR.js