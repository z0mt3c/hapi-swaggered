var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var it = lab.test;
var Code = require('code');
var expect = Code.expect;
var Joi = require('joi');
var Hoek = require('hoek');
var resources = require('../lib/resources');
//var utils = require('../lib/utils');
var generator = require('../lib/generator');
var schemas = require('../lib/schema');
var Hapi = require('hapi');
var _ = require('lodash');

var baseRoute = {
    method: 'GET',
    path: '/testEndpoint',
    config: {
        tags: ['api', 'test'],
        handler: function(request, reply) {
            reply({});
        }
    }
};

var internals = {
    resources: function(routes, settings, tags) {
        var server = new Hapi.Server();
        server.connection({port: 80});

        settings = settings || {};
        server.route(routes);
        var table = server.connections[0].table();
        var myResources = resources(settings, table, tags);
        Joi.assert(myResources.paths, Joi.object({}).pattern(/./g, schemas.Path));
        Joi.assert(myResources.definitions, Joi.object({}).pattern(/./g, schemas.Definition));
        return myResources;
    }
};

describe('resources', function() {
    it('check setup', function(done) {
        var resources = internals.resources(baseRoute);
        expect(resources).to.exist;
        expect(resources.paths['/testEndpoint'].get).to.exist;
        done();
    });

    it('filtering', function(done) {
        var route1 = Hoek.applyToDefaults(baseRoute, {config: {tags: ['myTestTag']}});
        var route2 = Hoek.applyToDefaults(baseRoute, {method: 'POST', config: {tags: ['myTestTag', 'requiredTag']}});
        var resources = internals.resources([route1, route2], {}, 'requiredTag');
        expect(resources.paths['/testEndpoint']).to.only.include('post');
        resources = internals.resources([route1, route2], {}, '-requiredTag');
        expect(resources.paths['/testEndpoint']).to.only.include('get');
        resources = internals.resources([route1, route2], {requiredTags: ['requiredTag']});
        expect(resources.paths['/testEndpoint']).to.only.include('post');
        done();
    });

    it('tags are exposed', function(done) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {tags: ['myTestTag']}}));
        expect(resources).to.exist;
        expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: ['myTestTag']});
        done();
    });

    it('deprecation', function(done) {
        var tags = ['myTestTag', 'deprecated'];
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {tags: tags}}));
        expect(resources).to.exist;
        expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: tags, deprecated: true});
        done();
    });

    describe('params', function() {
        it('simple', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo/{bar}',
                config: {validate: {params: Joi.object({bar: Joi.string().description('test').required()})}}
            }));

            expect(resources).to.exist;
            expect(resources.paths['/foo/{bar}'].get).to.deep.include({
                parameters: [{
                    required: true,
                    description: 'test',
                    type: 'string',
                    name: 'bar',
                    in: 'path'
                }]
            });

            done();
        });
    });

    describe('query', function() {
        it('simple', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                config: {validate: {query: Joi.object({bar: Joi.string().description('test').required()})}}
            }));

            expect(resources).to.exist;
            expect(resources.paths['/foo'].get).to.deep.include({
                parameters: [{
                    required: true,
                    description: 'test',
                    type: 'string',
                    name: 'bar',
                    in: 'query'
                }]
            });

            done();
        });

        /*
         TODO:
         test validation e.g.
         default: 10
         minimum: 11
         maximum: 10000
         */
    });


    describe('payload', function() {
        it('simple', function(done) {
            var expectedParam = {
                name: 'TestModel',
                required: true,
                in: 'body',
                description: 'foobar',
                schema: {
                    $ref: '#/definitions/TestModel'
                }
            };

            Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid');

            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                method: 'post',
                config: {validate: {payload: Joi.object({bar: Joi.string().description('test').required()}).description('foobar').required().options({className: 'TestModel'})}}
            }));

            expect(resources).to.exist;
            expect(resources.paths['/foo'].post).to.deep.include({
                parameters: [expectedParam]
            });
            expect(resources.definitions.TestModel).to.exist;

            done();
        });

        /*
         TODO:
         test validation e.g.
         default: 10
         minimum: 11
         maximum: 10000
         */
    });
});
