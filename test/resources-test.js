var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var it = lab.test;
var Code = require('code');
var expect = Code.expect;
var Joi = require('joi');
var Hoek = require('hoek');
var resources = require('../lib/resources');
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
        expect(resources).to.exist();
        expect(resources.paths['/testEndpoint'].get).to.exist();
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
        expect(resources).to.exist();
        expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: ['myTestTag']});
        done();
    });

    it('notes->description and description->summary are exposed', function(done) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {notes: 'my notes', description: 'my description' }}));
        expect(resources).to.exist();
        expect(resources.paths['/testEndpoint'].get).to.deep.include({summary: 'my description', description: 'my notes'});
        done();
    });

    it('deprecation', function(done) {
        var tags = ['myTestTag', 'deprecated'];
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {tags: tags}}));
        expect(resources).to.exist();
        expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: tags, deprecated: true});
        done();
    });

    it('stripPrefix', function(done) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {path: '/api/foo/bar'}), {stripPrefix: '/api'});
        expect(resources).to.exist();
        expect(resources.paths['/api/foo/bar']).to.not.exist();
        expect(resources.paths['/foo/bar']).to.exist();
        done();
    });

    it('stripPrefix for ROOT', function(done) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {path: '/api'}), {stripPrefix: '/api'});
        expect(resources).to.exist();
        expect(resources.paths['/api']).to.not.exist();
        expect(resources.paths['/']).to.not.exist();
        done();
    });

    describe('params', function() {
        it('simple', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo/{bar}',
                config: {validate: {params: Joi.object({bar: Joi.string().description('test').required()})}}
            }));

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

    describe('responses', function() {
        //TODO: description, test with primary types + arrays
        it('only response model', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                config: {
                    response: {
                        schema: Joi.object({
                            bar: Joi.string().description('test').required()
                        }).description('test'),
                        status: {
                            500: Joi.object({
                                bar: Joi.string().description('test').required()
                            })
                        }
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foo'].get.responses).to.deep.include({
                default: {description: 'test', schema: {$ref: '#/definitions/BarModel'}},
                500: {description: undefined, schema: {$ref: '#/definitions/BarModel'}}
            });
            done();
        });

        it('plugin options without model', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                config: {
                    plugins: {
                        'hapi-swaggered': {
                            responses: {
                                default: {description: 'Bad Request'},
                                500: {description: 'Internal Server Error'}
                            }
                        }
                    },
                    response: {
                        schema: Joi.object({
                            bar: Joi.string().required()
                        }).description('test')
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foo'].get.responses).to.deep.include({
                default: {description: 'test', schema: {$ref: '#/definitions/BarModel'}},
                500: {description: 'Internal Server Error'}
            });

            done();
        });

        it('plugin options with model', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                config: {
                    plugins: {
                        'hapi-swaggered': {
                            responses: {
                                default: {
                                    description: 'Bad Request', schema: Joi.object({
                                        bar: Joi.string().description('test').required()
                                    })
                                },
                                500: {description: 'Internal Server Error'}
                            }
                        }
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foo'].get.responses).to.deep.include({
                default: {description: 'Bad Request', schema: {$ref: '#/definitions/BarModel'}},
                500: {description: 'Internal Server Error'}
            });

            done();
        });
    });

    describe('header', function() {
        it('simple', function(done) {
            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo/{bar}',
                config: {validate: {headers: Joi.object({bar: Joi.string().description('test').required()})}}
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foo/{bar}'].get).to.deep.include({
                parameters: [{
                    required: true,
                    description: 'test',
                    type: 'string',
                    name: 'bar',
                    in: 'header'
                }]
            });

            done();
        });
    });

    describe('query', function() {
        it('simple', function(done) {
            var params = {
                bar: Joi.string().description('test').required(),
                foo: Joi.number().integer().min(20).max(30).default(2).required(),
                array: Joi.array().items(Joi.string()),
                arrayOfObjects: Joi.array().items(Joi.object({bar: Joi.string().description('test').required()}))
            };

            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foo',
                config: {
                    validate: {
                        query: Joi.object(params)
                    }
                }
            }));

            expect(resources).to.exist();
            var parameters = resources.paths['/foo'].get.parameters;
            expect(parameters).to.have.length(_.keys(params).length);

            expect(parameters).to.deep.include({
                required: true,
                description: 'test',
                type: 'string',
                name: 'bar',
                in: 'query'
            });

            expect(parameters).to.deep.include({
                required: true,
                default: 2,
                minimum: 20,
                maximum: 30,
                type: 'integer',
                name: 'foo',
                in: 'query'
            });

            expect(parameters).to.deep.include({
                required: false,
                type: 'array',
                items: {type: 'string'},
                name: 'array',
                in: 'query'
            });

            expect(parameters).to.deep.include({
                required: false,
                type: 'array',
                items: {type: 'string'},
                name: 'array',
                in: 'query'
            });

            done();
        });
    });


    describe('form', function() {
        it('simple', function(done) {
            _.each(['application/x-www-form-urlencoded', 'multipart/form-data'], function(mimeType) {
                var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                    method: 'post',
                    path: '/foo/{bar}',
                    config: {
                        validate: {payload: Joi.object({bar: Joi.string().description('test').required()})},
                        payload: {allow: [mimeType]}
                    }
                }));

                expect(resources).to.exist();
                expect(resources.paths['/foo/{bar}'].post).to.deep.include({
                    parameters: [{
                        required: true,
                        description: 'test',
                        type: 'string',
                        name: 'bar',
                        in: 'formData'
                    }]
                });
            });

            done();
        });
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
                config: {validate: {payload: Joi.object({bar: Joi.string().description('test').required()}).description('foobar').required().meta({className: 'TestModel'})}}
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foo'].post).to.deep.include({
                parameters: [expectedParam]
            });
            expect(resources.definitions.TestModel).to.exist();

            done();
        });

        it('array of primitive', function(done) {
            var expectedParam = {
                name: 'Test',
                in: 'body',
                required: true,
                description: 'foobar',
                schema: {
                    $ref: '#/definitions/Test'
                }
            };

            Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid');

            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foobar/test',
                method: 'post',
                config: {
                    tags: ['api'],
                    validate: {
                        payload: Joi.array().items(
                            Joi.string()
                        ).description('foobar').required().meta({className: 'Test'})
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foobar/test'].post).to.deep.include({
                parameters: [expectedParam]
            });
            expect(resources.definitions.Test).to.exist();
            expect(resources.definitions.Test).to.deep.include({
                type: 'array',
                description: 'foobar',
                items: {type: 'string'}
            });

            done();
        });

        it('array of primitive', function(done) {
            var expectedParam = {
                name: 'Array',
                in: 'body',
                required: true,
                description: 'foobar',
                schema: {
                    $ref: '#/definitions/Array'
                }
            };

            Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid');

            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foobar/test',
                method: 'post',
                config: {
                    tags: ['api'],
                    validate: {
                        payload: Joi.array().items(
                            Joi.string()
                        ).description('foobar').required()
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foobar/test'].post).to.deep.include({
                parameters: [expectedParam]
            });

            expect(resources.definitions.Array).to.exist();
            expect(resources.definitions.Array).to.deep.include({
                type: 'array',
                description: 'foobar',
                items: {type: 'string'}
            });

            done();
        });

        it('array of objects', function(done) {
            var expectedParam = {
                name: 'Array',
                in: 'body',
                required: true,
                description: 'foobar',
                schema: {
                    $ref: '#/definitions/Array'
                }
            };

            Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid');

            var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
                path: '/foobar/test',
                method: 'post',
                config: {
                    tags: ['api'],
                    validate: {
                        payload: Joi.array().items(
                            Joi.object({name: Joi.string()})
                        ).description('foobar').required()
                    }
                }
            }));

            expect(resources).to.exist();
            expect(resources.paths['/foobar/test'].post).to.deep.include({
                parameters: [expectedParam]
            });

            expect(resources.definitions.Array).to.exist();
            expect(resources.definitions.Array).to.deep.include({
                type: 'array',
                description: 'foobar',
                items: {$ref: 'NameModel'}
            });

            done();
        });
    });
});
