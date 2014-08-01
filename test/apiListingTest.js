var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var Joi = require('joi');

var apiListing = require('../lib/apiListing');
var schema = require('../lib/schema');
var utils = require('../lib/utils');
var generator = require('../lib/generator');
var sinon = require('sinon');

describe('apiListing', function () {
    var filterRoutesByTags, extractAPIKeys, getDescription;

    describe('integration', function() {
        it('#1', function (done) {
            var routes = [
                { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
                { path: '/test', method: 'get', settings: { tags: ['dev', 'api'] }}
            ];
            var settings = {};
            var swaggerServerSettings = {};
            var tags = null;
            var list = apiListing(settings)(routes, tags, swaggerServerSettings);
            expect(list).to.exist.and.to.have.length(2).and.to.have.deep.property('[0].path').that.to.eql('/dev');
            done();
        });

        it('#2', function (done) {
            var routes = [
                { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
                { path: '/test', method: 'get', settings: { tags: ['dev', 'api'] }}
            ];
            var settings = { requiredTag: 'api' };
            var swaggerServerSettings = {};
            var tags = null;
            var list = apiListing(settings)(routes, tags, swaggerServerSettings);
            expect(list).to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/test');
            done();
        });

        it('#3', function (done) {
            var routes = [
                { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
                { path: '/test', method: 'get', settings: { tags: ['dev', 'api'] }},
                { path: '/zong', method: 'get', settings: { tags: ['dev', 'api', 'test'] }}
            ];
            var settings = { requiredTag: 'api' };
            var swaggerServerSettings = {};

            expect(apiListing(settings)(routes, ['test'], swaggerServerSettings))
                .to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/zong');
            expect(apiListing(settings)(routes, 'test', swaggerServerSettings))
                .to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/zong');
            expect(apiListing(settings)(routes, 'api', swaggerServerSettings))
                .to.exist.and.to.have.length(2);

            done();
        });

        it('description', function (done) {
            var routes = [
                { path: '/test', method: 'get', settings: { tags: ['api'] }}
            ];

            var settings = {
                requiredTag: 'api',
                descriptions: { test: 'mep' }
            };

            expect(apiListing(settings)(routes, null, {}))
                .to.exist.and.to.have.length(1)
                .and.to.have.deep.property('[0]').that.to.eql({ path: '/test', description: 'mep' });

            expect(apiListing(settings)(routes, null, { descriptions: { test: 'mep2' }}))
                .to.exist.and.to.have.length(1)
                .and.to.have.deep.property('[0]').that.to.eql({ path: '/test', description: 'mep2' });

            done();
        });
    });

    describe('flow', function () {
        Lab.beforeEach(function (done) {
            filterRoutesByTags = sinon.stub(utils, 'filterRoutesByTags');
            extractAPIKeys = sinon.stub(utils, 'extractAPIKeys');
            getDescription = sinon.stub(utils, 'getDescription');
            done();
        });

        Lab.afterEach(function (done) {
            utils.filterRoutesByTags.restore();
            utils.extractAPIKeys.restore();
            utils.getDescription.restore();
            done();
        });

        it('empty', function (done) {
            var apiLister = apiListing({});
            var list = apiLister([], {});
            expect(list).to.exist;
            expect(list).to.be.empty;
            done();
        });

        it('filterRoutesByTags', function (done) {
            var settings = {};
            var routeList = [
                { path: '/dev/null', method: 'get', settings: { tags: ['Hapi'] } },
                { path: '/dev/null', method: 'get', settings: { tags: ['api', 'Hapi'] } }
            ];

            var apiKeys = [ 'hapi' ];
            filterRoutesByTags.returns(routeList);
            extractAPIKeys.withArgs(routeList).returns(apiKeys);
            getDescription.withArgs(settings, apiKeys[0]).returns('MyTestDescription');

            var apiLister = apiListing(settings);
            expect(apiLister([], {})).to.exist.and.to.be.eql([
                { path: 'hapi', description: 'MyTestDescription' }
            ]);
            done();
        });
    });
});