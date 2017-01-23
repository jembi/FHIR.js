var Fhir = require('../../fhir');
var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');
var request = require('request');
var path = require('path');

describe('STU3: Proxy', function() {
    describe('capabilities()', function () {
        it('should query the capabilities of the FHIR server with JSON', function (done) {
            var getStub = sinon.stub(request, 'get');
            getStub
                .withArgs('http://test.com/fhir/metadata')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/json' } }, fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/capabilities.json')).toString());

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy('http://test.com/fhir');

            proxy.capabilities()
                .then(function(capabilities) {
                    assert(capabilities);
                    assert.equal('CapabilityStatement', capabilities.resourceType);
                    assert(capabilities.rest);
                    assert.equal(1, capabilities.rest.length);
                    assert.equal('server', capabilities.rest[0].mode);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .finally(function() {
                    getStub.restore();
                });
        });

        it('should query the capabilities of the FHIR server with XML', function (done) {
            var getStub = sinon.stub(request, 'get');
            getStub
                .withArgs('http://test.com/fhir/metadata')
                .callsArgWith(2, null, { headers: { 'content-type': 'application/xml' } }, fs.readFileSync(path.join(__dirname, '/../data/stu3/proxy/capabilities.xml')).toString());

            var fhir = new Fhir(Fhir.STU3);
            var proxy = fhir.GetServerProxy('http://test.com/fhir', true);

            proxy.capabilities()
                .then(function(capabilities) {
                    assert(capabilities);
                    assert.equal('CapabilityStatement', capabilities.resourceType);
                    assert(capabilities.rest);
                    assert.equal(1, capabilities.rest.length);
                    assert.equal('server', capabilities.rest[0].mode);
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });
    });
});