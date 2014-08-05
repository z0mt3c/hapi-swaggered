var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var Joi = require('joi');

var apiListing = require('../lib/apiListing');
var schema = require('../lib/schema');
var utils = require('../lib/utils');
var generator = require('../lib/generator');
var schemas = require('../lib/schema');
var sinon = require('sinon');
var Hapi = require('hapi');

describe('apiListing', function () {
    var filterRoutesByTagSelection, filterRoutesByRequiredTags, extractAPIKeys, getDescription;

    describe('integration', function () {
        it('#1', function (done) {

            var handler = function () {};
            var server = Hapi.createServer('localhost', 8000);
            server.route([
                { path: '/dev', method: 'post', config: { tags: ['dev'], handler: handler }},
                { path: '/test', method: 'get', config: { tags: ['dev', 'api'], handler: handler }}
            ]);

            var routes = server.table();
            var settings = {};
            var swaggerServerSettings = {};
            var tags = null;
            var list = apiListing(settings)(routes, tags, swaggerServerSettings);
            expect(list).to.exist.and.to.have.length(2).and.to.have.deep.property('[0].path').that.to.eql('/dev');

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('#2', function (done) {
            var handler = function () {};
            var server = Hapi.createServer('localhost', 8000);
            server.route([
                { path: '/dev', method: 'post', config: { tags: ['dev'], handler: handler }},
                { path: '/test', method: 'get', config: { tags: ['dev', 'api'], handler: handler }}
            ]);

            var routes = server.table();
            var settings = { requiredTags: ['api'] };
            var swaggerServerSettings = {};
            var tags = null;
            var list = apiListing(settings)(routes, tags, swaggerServerSettings);
            expect(list).to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/test');

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('#3', function (done) {
            var handler = function () {};
            var server = Hapi.createServer('localhost', 8000);
            server.route([
                { path: '/dev', method: 'post', config: { tags: ['dev'], handler: handler}},
                { path: '/test', method: 'get', config: { tags: ['dev', 'api'], handler: handler}},
                { path: '/zong', method: 'get', config: { tags: ['dev', 'api', 'test'], handler: handler}}
            ]);

            var routes = server.table();
            var settings = { requiredTag: 'api' };
            var swaggerServerSettings = {};

            expect(apiListing(settings)(routes, ['test'], swaggerServerSettings))
                .to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/zong');
            expect(apiListing(settings)(routes, 'test', swaggerServerSettings))
                .to.exist.and.to.have.length(1).and.to.have.deep.property('[0].path').that.to.eql('/zong');
            var list = apiListing(settings)(routes, 'api', swaggerServerSettings);
            expect(list)
                .to.exist.and.to.have.length(2);

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('description', function (done) {
            var handler = function () {};
            var server = Hapi.createServer('localhost', 8000);
            server.route([
                { path: '/test', method: 'get', config: { tags: ['api'], handler: handler }}
            ]);

            var settings = {
                requiredTag: 'api',
                descriptions: { test: 'mep' }
            };

            expect(apiListing(settings)(server.table(), null, {}))
                .to.exist.and.to.have.length(1)
                .and.to.have.deep.property('[0]').that.to.eql({ path: '/test', description: 'mep' });

            var list = apiListing(settings)(server.table(), null, { descriptions: { test: 'mep2' }});
            expect(list)
                .to.exist.and.to.have.length(1)
                .and.to.have.deep.property('[0]').that.to.eql({ path: '/test', description: 'mep2' });

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });
    });

    describe('flow', function () {
        Lab.beforeEach(function (done) {
            filterRoutesByTagSelection = sinon.spy(utils, 'filterRoutesByTagSelection');
            filterRoutesByRequiredTags = sinon.spy(utils, 'filterRoutesByRequiredTags');
            extractAPIKeys = sinon.spy(utils, 'extractAPIKeys');
            getDescription = sinon.spy(utils, 'getDescription');
            done();
        });

        Lab.afterEach(function (done) {
            utils.filterRoutesByTagSelection.restore();
            utils.filterRoutesByRequiredTags.restore();
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

        it('filterRoutesByTagSelection', function (done) {
            var settings = {
                descriptions: {
                    'status': 'MyTestDescription',
                    'user': 'MyTestDescription'
                }
            };

            var handler = function () {};

            var server = Hapi.createServer('localhost', 8000);
            server.route([
                { method: 'GET', path: '/status/test', config: { tags: ['Hapi'], handler: handler }},
                { method: 'GET', path: '/user/test', config: { tags: ['api', 'Hapi'], handler: handler }}
            ]);

            var apiLister = apiListing(settings);
            expect(apiLister(server.table(), {})).to.exist.and.to.be.eql([
                { path: '/status', description: 'MyTestDescription' },
                { path: '/user', description: 'MyTestDescription' }
            ]);

            done();
        });
    });
});