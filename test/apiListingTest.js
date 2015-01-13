var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var Joi = require('joi');

var apiListing = require('../lib/apiListing');
var utils = require('../lib/utils');
var schemas = require('../lib/schema');
var sinon = require('sinon');
var Hapi = require('hapi');

describe('apiListing', function() {
    var filterRoutesByTagSelection, filterRoutesByRequiredTags, extractAPIKeys, getDescription;

    describe('stripPrefix', function() {
        it('#1', function(done) {
            var handler = function() {
            };
            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {path: '/api/dev', method: 'post', config: {tags: ['dev'], handler: handler}},
                {path: '/api/test', method: 'get', config: {tags: ['dev', 'api'], handler: handler}}
            ]);

            var routes = server.connections[0].table();
            var settings = {stripPrefix: '/api'};
            var tags = null;
            var list = apiListing(settings, routes, tags);
            expect(list).to.exist;
            expect(list).to.have.length(2);
            expect(list).to.have.deep.property('[0].path').that.to.eql('/dev');

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function(err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });
    });

    describe('integration', function() {
        it('#1', function(done) {

            var handler = function() {
            };
            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {path: '/dev', method: 'post', config: {tags: ['dev'], handler: handler}},
                {path: '/test', method: 'get', config: {tags: ['dev', 'api'], handler: handler}}
            ]);

            var routes = server.connections[0].table();
            var settings = {};
            var tags = null;
            var list = apiListing(settings, routes, tags);
            expect(list).to.exist;
            expect(list).to.have.length(2);
            expect(list).to.have.deep.property('[0].path').that.to.eql('/dev');

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function(err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('#2', function(done) {
            var handler = function() {
            };
            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {path: '/dev', method: 'post', config: {tags: ['dev'], handler: handler}},
                {path: '/test', method: 'get', config: {tags: ['dev', 'api'], handler: handler}}
            ]);

            var routes = server.connections[0].table();
            var settings = {requiredTags: ['api']};
            var tags = null;
            var list = apiListing(settings, routes, tags);
            expect(list).to.exist;
            expect(list).to.have.length(1);
            expect(list).to.have.deep.property('[0].path').that.to.eql('/test');

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function(err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('#3', function(done) {
            var handler = function() {
            };
            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {path: '/dev', method: 'post', config: {tags: ['dev'], handler: handler}},
                {path: '/test', method: 'get', config: {tags: ['dev', 'api'], handler: handler}},
                {path: '/zong', method: 'get', config: {tags: ['dev', 'api', 'test'], handler: handler}}
            ]);

            var routes = server.connections[0].table();
            var settings = {requiredTag: 'api'};

            var apiListing2 = apiListing(settings, routes, ['test']);
            expect(apiListing2).to.exist;
            expect(apiListing2).to.have.length(1);
            expect(apiListing2).to.have.deep.property('[0].path').that.to.eql('/zong');
            var apiListing3 = apiListing(settings, routes, 'test');
            expect(apiListing3).to.exist;
            expect(apiListing3).to.have.length(1);
            expect(apiListing3).to.have.deep.property('[0].path').that.to.eql('/zong');
            var list = apiListing(settings, routes, 'api');
            expect(list).to.exist;
            expect(list).to.have.length(2);

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function(err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('description', function(done) {
            var handler = function() {
            };
            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {path: '/test', method: 'get', config: {tags: ['api'], handler: handler}}
            ]);

            var settings = {
                requiredTag: 'api',
                descriptions: {test: 'mep'}
            };

            var list = apiListing(settings, server.connections[0].table(), null);
            expect(list).to.exist;
            expect(list).to.have.length(1);
            expect(list).to.have.deep.property('[0]').that.to.eql({path: '/test', description: 'mep'});

            Joi.validate(list, Joi.array().includes(schemas.APIReference), function(err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });
    });

    describe('flow', function() {
        lab.beforeEach(function(done) {
            filterRoutesByTagSelection = sinon.spy(utils, 'filterRoutesByTagSelection');
            filterRoutesByRequiredTags = sinon.spy(utils, 'filterRoutesByRequiredTags');
            extractAPIKeys = sinon.spy(utils, 'extractAPIKeys');
            getDescription = sinon.spy(utils, 'getDescription');
            done();
        });

        lab.afterEach(function(done) {
            utils.filterRoutesByTagSelection.restore();
            utils.filterRoutesByRequiredTags.restore();
            utils.extractAPIKeys.restore();
            utils.getDescription.restore();
            done();
        });

        it('empty', function(done) {
            var list = apiListing({}, [], {});
            expect(list).to.exist;
            expect(list).to.be.empty;
            done();
        });

        it('filterRoutesByTagSelection', function(done) {
            var settings = {
                descriptions: {
                    'status': 'MyTestDescription',
                    'user': 'MyTestDescription'
                }
            };

            var handler = function() {
            };

            var server = new Hapi.Server();
            server.connection({port: 80, host: 'example.com'});
            server.route([
                {method: 'GET', path: '/status/test', config: {tags: ['Hapi'], handler: handler}},
                {method: 'GET', path: '/user/test', config: {tags: ['api', 'Hapi'], handler: handler}}
            ]);

            expect(apiListing(settings, server.connections[0].table(), {})).to.exist.and.to.be.eql([
                {path: '/status', description: 'MyTestDescription'},
                {path: '/user', description: 'MyTestDescription'}
            ]);

            done();
        });
    });
});
