var request = require('request');
var url = require('url');
var Q = require('q');

/**
 * @class
 * @memberof module:stu3
 * @param {string} baseAddress The base address of the FHIR server to establish a connection with
 * @constructor
 */
var Proxy = function(fhirInstance, baseAddress, requestWithXml) {
    /**
     * The instance of the Fhir class that created the Proxy (for use to serialize/deserialize requests and responses).
     * @type {Fhir}
     * @private
     */
    this._fhirInstance = fhirInstance;

    /**
     * The base address of the FHIR server to establish a connection with
     * @type {string}
     * @private
     */
    this._baseAddress = baseAddress;

    this._requestWithXml = requestWithXml;

    /**
     * Callback function that is executed prior to a FHIR server request being made
     * @type {module:stu3~BeforeRequestEvent}
     */
    this.beforeRequest = null;

    /**
     * Callback function that is executed after a response has been received by the FHIR server, and before the response is returned to the caller
     * @type {module:stu3~AfterResponseEvent}
     */
    this.afterResponse = null;
};

module.exports = Proxy;

/*
 * Public Methods
 */

/**
 * Read the current state of the resource
 * @method
 * @param type The name of a resource type (e.g. "Patient")
 * @param id The Logical Id of a resource
 */
Proxy.prototype.read = function(type, id) {
    var options = {
        method: 'GET',
        url: url.join(this._baseAddress, type, id)
    };

    return this._genericRequest(options);
};

/**
 * Read the state of a specific version of the resource
 * @method
 * @param type The name of a resource type (e.g. "Patient")
 * @param id The Logical Id of a resource
 * @param vid The Version Id of a resource
 */
Proxy.prototype.vread = function(type, id, vid) {
    var options = {
        method: 'GET',
        url: url.join(this._baseAddress, type, id, '_history', vid)
    };

    return this._genericRequest(options);
};

/**
 * Either creates or updates the specified resource, depending on the whether 'id' exists on the resource
 * @method
 * @param resource The resource to save.
 */
Proxy.prototype.save = function(resource) {
    if (!resource.resourceType) {
        throw 'No resourceType defined on resource';
    }

    if (resource.id) {
        return this.update(resource.resourceType, resource.id);
    } else {
        return this.create(resource.resourceType, resource);
    }
};

/**
 * @param type The name of a resource type (e.g. "Patient")
 * @param id The Logical Id of a resource
 * @param resource The resource to update
 */
Proxy.prototype.update = function(type, id, resource) {
    var options = {
        method: 'PUT',
        url: url.join(this._baseAddress, type, id)
    };

    return this._genericRequest(options, resource);
};

/**
 * Update an existing resource by posting a set of changes to it
 * @method
 * @param type The name of a resource type (e.g. "Patient")
 * @param id The Logical Id of a resource
 * @param {string[]} paths Array of paths on the resource to patch
 * @param resource The resource to patch update
 */
Proxy.prototype.patch = function(type, id, paths, resource) {

};

/**
 * Delete a resource
 * @method
 * @param [type] The name of a resource type (e.g. "Patient")
 * @param [id] The Logical Id of a resource
 */
Proxy.prototype.delete  = function(type, id) {
    var options = {
        method: 'DELETE',
        url: url.join(this._baseAddress, type, id)
    };

    return this._genericRequest(options);
};

/**
 * Create a new resource with a server assigned id
 * @method
 * @param type The name of a resource type (e.g. "Patient")
 * @param resource The resource to create
 */
Proxy.prototype.create = function(type, resource) {
    var options = {
        method: 'POST',
        url: url.join(this._baseAddress, type)
    };

    return this._genericRequest(options, resource);
};

/**
 * Search the resource type based on some filter criteria
 * @method
 * @param type The name of a resource type (e.g. "Patient")
 * @param [Object.<string, string>] URL parameters as defined for the particular interaction. Key is parameter name, value is param value
 * @param [compartmentType]
 * @param [compartmentId]
 */
Proxy.prototype.search = function(type, parameters, compartmentType, compartmentId) {
    if ((compartmentType && !compartmentId) || (!compartmentType && compartmentId)) {
        throw 'Compartmental searches must include both compartment type AND id';
    }

    var requestUrl = url.join(this._baseAddress, type);

    if (compartmentType && compartmentId) {
        requestUrl = url.join(this._baseAddress, compartmentType, compartmentId, type);
    }

    if (parameters && typeof parameters === 'object') {
        var paramKeys = Object.keys(parameters);
        var parts = [];

        for (var i in paramKeys) {
            var paramKey = encodeURIComponent(paramKeys[i]);
            var paramValue = encodeURIComponent(parameters[paramKey]);

            parts.push(paramKey + '=' + paramValue);
        }

        requestUrl += '?' + parts.join('&');
    }

    var options = {
        method: 'GET',
        url: requestUrl
    };

    return this._genericRequest(options);
};

/**
 * Retrieve the change history for a particular resource type
 * @method
 * @param parameters
 * @param [type] The name of a resource type (e.g. "Patient")
 * @param [id] The Logical Id of a resource
 */
Proxy.prototype.history = function(parameters, type, id) {
    var requestUrl = url.join(this._baseAddress, type, id, '_history');

    var options = {
        method: 'GET',
        url: requestUrl
    };

    return this._genericRequest(options);
};

/**
 * Gets the capabilities of the server
 * @method
 */
Proxy.prototype.capabilities = function() {
    var options = {
        method: 'GET',
        url: url.join(this._baseAddress, '/metadata')
    };

    return this._genericRequest(options);
};

/**
 * Update, create or delete a set of resources in a single interaction
 * @method
 */
Proxy.prototype.createBatch = function() {

};

/*
 * Private Methods
 */

/**
 * Executes a request using the options specified.
 * @param options Options for the request.
 * @param options.url The url of the request
 * @param options.method The method of the request (ex: 'GET', 'POST', 'PATCH', 'PUT')
 * @returns {*|promise}
 * @private
 */
Proxy.prototype._genericRequest = function(options, body) {
    var self = this;
    var deferred = Q.defer();

    if (!options.hasOwnProperty('headers')) {
        options.headers = {};
    }

    if (this.beforeRequest) {
        this.beforeRequest(options.headers);
    }

    if (body && typeof body == 'object' && this._requestWithXml) {
        options.body = this._fhirInstance.ObjectToXml(body);
        options.headers['content-type'] = 'application/xml+fhir';
    } else if (body) {
        options.headers['content-type'] = 'application/json+fhir';
        options.body = body;
        options.json = true;
    }

    var requestMethod = null;

    switch (options.method) {
        case 'GET':
            requestMethod = request.get;
            break;
        case 'POST':
            requestMethod = request.post;
            break;
        case 'PUT':
            requestMethod = request.put;
            break;
        case 'PATCH':
            requestMethod = request.patch;
            break;
        case 'DEL':
        case 'DELETE':
            requestMethod = request.delete;
            break;
        case 'HEAD':
            requestMethod = request.head;
            break;
        default:
            throw 'Unknown request method ' + options.method;
    }

    if (this._requestWithXml) {
        options.headers['Accept'] = 'application/xml';
    }

    var requestUrl = options.url;
    delete options.url;

    requestMethod(requestUrl, options, function(error, response, body) {
        if (self.afterResponse) {
            self.afterResponse(response.headers, body);
        }

        if (error) {
            deferred.reject(error);
        } else if (body) {
            if (isJson(response.headers['content-type'])) {
                var responseObj = JSON.parse(body);
                deferred.resolve(responseObj);
            } else if (isXml(response.headers['content-type'])) {
                self._fhirInstance.XmlToObject(body)
                    .then(function(responseObj) {
                        deferred.resolve(responseObj);
                    })
                    .catch(function(err) {
                        deferred.reject(err);
                    });
            } else {
                throw 'Unexpected response content-type: ' + response.headers['content-type'];
            }
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
};

/*
 * Static Methods
 */
url.join = function() {
    var fullUrl = '';

    for (var i = 0; i < arguments.length; i++) {
        if (!arguments[i]) {
            continue;
        }

        if (!fullUrl) {
            fullUrl = arguments[i];
            continue;
        }

        if (!fullUrl.endsWith('/')) {
            fullUrl += '/';
        }

        if (arguments[i].startsWith('/')) {
            arguments[i] = arguments[i].substring(1);
        }

        fullUrl += arguments[i];
    }

    return fullUrl;
};

function isJson(contentType) {
    if (!contentType) {
        return true;
    }

    var contentTypeSplit = contentType.split(';');
    var coreContentType = contentTypeSplit[0];

    switch (coreContentType) {
        case 'application/fhir+json':
        case 'application/json+fhir':
        case 'application/json':
            return true;
        default:
            return false;
    }
};

function isXml(contentType) {
    if (!contentType) {
        return true;
    }

    var contentTypeSplit = contentType.split(';');
    var coreContentType = contentTypeSplit[0];

    switch (coreContentType) {
        case 'application/fhir+xml':
        case 'application/xml+fhir':
        case 'application/xml':
        case 'text/xml':
            return true;
        default:
            return false;
    }
};