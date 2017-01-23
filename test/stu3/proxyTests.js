var Fhir = require('../../fhir');
var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');
var request = require('request');
var path = require('path');

var BASE_FHIR_SERVER = 'http://test.com/fhir';

describe.only('STU3: Proxy', function() {
    describe('capabilities() - including callbacks', function () {
        it('should query the capabilities of the FHIR server with JSON', function (done) {
            var getStub = sinon.stub(request, 'get');
            getStub
                .withArgs(BASE_FHIR_SERVER + '/metadata')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/json' } }, fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/capabilities.json')).toString());

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy(BASE_FHIR_SERVER);

            proxy.beforeRequest = sinon.spy();
            proxy.afterResponse = sinon.spy();

            proxy.capabilities()
                .then(function(capabilities) {
                    assert(capabilities);
                    assert.equal('CapabilityStatement', capabilities.resourceType);
                    assert(capabilities.rest);
                    assert.equal(1, capabilities.rest.length);
                    assert.equal('server', capabilities.rest[0].mode);

                    assert(proxy.beforeRequest.calledOnce);
                    assert.equal(1, proxy.beforeRequest.args[0].length);
                    assert.equal(0, Object.keys(proxy.beforeRequest.args[0][0]).length);
                    assert.equal('object', typeof proxy.beforeRequest.args[0][0]);

                    assert(proxy.afterResponse.calledOnce);
                    assert.equal(2, proxy.afterResponse.args[0].length);
                    assert.equal('application/json', proxy.afterResponse.args[0][0]['content-type']);
                    assert.equal(675896, proxy.afterResponse.args[0][1].length);

                    done();
                })
                .catch(done)
                .finally(getStub.restore);
        });

        it('should query the capabilities of the FHIR server with XML', function (done) {
            var getStub = sinon.stub(request, 'get');
            getStub
                .withArgs(BASE_FHIR_SERVER + '/metadata')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/xml' } }, fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/capabilities.xml')).toString());

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy(BASE_FHIR_SERVER, true);

            proxy.capabilities()
                .then(function(capabilities) {
                    assert(capabilities);
                    assert.equal('CapabilityStatement', capabilities.resourceType);
                    assert(capabilities.rest);
                    assert.equal(1, capabilities.rest.length);
                    assert.equal('server', capabilities.rest[0].mode);
                    done();
                })
                .catch(done)
                .finally(getStub.restore);
        });
    });

    describe('search()', function() {
        it('should return all composition resources', function(done) {
            var getStub = sinon.stub(request, 'get');
            var compositionAllBundleContent = fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/compositionAllBundle.json')).toString()
            getStub
                .withArgs(BASE_FHIR_SERVER + '/Composition')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/json' } }, compositionAllBundleContent);

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy(BASE_FHIR_SERVER);

            proxy.search('Composition')
                .then(function(bundle) {
                    assert(bundle);
                    assert(bundle.entry);
                    assert.equal(20, bundle.entry.length);
                    assert.equal('2335a6c3-6adf-4995-9397-3d3946bbe5fe', bundle.id);
                    assert.equal('Bundle', bundle.resourceType);

                    for (var i = 0; i < bundle.entry.length; i++) {
                        assert(bundle.entry[i].resource);
                        assert.equal('Composition', bundle.entry[i].resource.resourceType);
                    }

                    done();
                })
                .catch(done)
                .finally(getStub.restore);
        });

        it('should search with one param', function(done) {
            var getStub = sinon.stub(request, 'get');
            var compositionRecentBundle = fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/compositionRecentBundle.json')).toString()
            getStub
                .withArgs(BASE_FHIR_SERVER + '/Composition?_lastUpdated=%3E2017-01-06')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/json' } }, compositionRecentBundle);

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy(BASE_FHIR_SERVER);

            var searchParams = {
                '_lastUpdated': '>2017-01-06'
            };

            proxy.search('Composition', searchParams)
                .then(function(bundle) {
                    assert(bundle);
                    assert.equal('Bundle', bundle.resourceType);
                    assert(bundle.entry);
                    assert.equal(20, bundle.entry.length);

                    done();
                })
                .catch(done)
                .finally(getStub.restore);
        });

        /*
        it('should compartmentally search', function(done) {
            done('not tested yet');
        });
        */
    });
});