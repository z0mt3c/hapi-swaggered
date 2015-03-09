var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var Joi = require('joi');

var Hapi = require('hapi');
var Hoek = require('hoek');
var index = require('../');


var simpleSchema = Joi.object().keys({name: Joi.string()}).meta({className: 'SimpleTestModel'});

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

describe('indexTest', function() {
    describe('init', function() {
        it('no options', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});
            server.register({
                register: index
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('empty options', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});

            server.register({
                register: index,
                options: {}
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('with route prefix', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});

            server.register({
                register: index,
                options: {
                    stripPrefix: '/api'
                }
            }, {
                routes: {
                    prefix: '/api/test123'
                }
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('without response validation', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});

            server.register({
                register: index,
                options: {
                    responseValidation: false
                }
            }, {
                routes: {
                    prefix: '/api/test123'
                }
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        it('broken info', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});

            var options = {
                register: index,
                options: {
                    info: {bull: 'shit'}
                }
            };

            var reply = function() {
            };
            expect(server.register.bind(server.pack, options, reply)).to.throw();
            done();
        });

        it('valid info', function(done) {
            var server = new Hapi.Server();
            server.connection({port: 80});

            var options = {
                register: index,
                options: {
                    info: {
                        title: 'Overwritten',
                        description: 'Description',
                        termsOfServiceUrl: 'http://hapijs.com/',
                        contact: 'xxx@xxx.com',
                        license: 'XXX',
                        licenseUrl: 'http://XXX'
                    }
                }
            };

            server.register(options, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });
    });

    describe('apiListing', function() {
        var server;
        var pluginOptions = {
            descriptions: {
                'serverDescription': 'myDesc2'
            }
        };

        lab.beforeEach(function(done) {
            server = new Hapi.Server();
            server.connection({port: 80});
            server.register({
                register: index,
                options: pluginOptions
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        lab.afterEach(function(done) {
            done();
        });

        it('apiListing contains baseRoute', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {}));

            server.inject('/swagger', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(200);
                expect(res.result).to.exist.and.to.have.property('swaggerVersion', '1.2');
                expect(res.result.apis).to.have.length(1);
                expect(res.result).to.have.deep.property('apis[0].path', '/testEndpoint');
                expect(res.result).not.to.have.deep.property('apis[0].description');
                done();
            });
        });

        it('apiListing contains tags', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {}));

            server.inject('/swagger?tags=test', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(200);
                expect(res.result).to.exist.and.to.have.property('swaggerVersion', '1.2');
                expect(res.result).to.exist.and.to.have.property('basePath', 'http://localhost/swagger/list?tags=test&path=');
                expect(res.result).to.have.deep.property('apis[0].path', '/testEndpoint');
                expect(res.result).not.to.have.deep.property('apis[0].description');
                done();
            });
        });

        it('apiListing with server descriptions', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {}));

            server.connections[0].settings.app = {swagger: {descriptions: {'testEndpoint': 'myDesc'}}};

            server.inject('/swagger', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(200);
                expect(res.result).to.exist.and.to.have.property('swaggerVersion', '1.2');
                expect(res.result).to.have.deep.property('apis[0].path', '/testEndpoint');
                expect(res.result).to.have.deep.property('apis[0].description', 'myDesc');
                done();
            });
        });

        it('apiListing with plugin descriptions', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {path: '/serverDescription'}));
            pluginOptions.descriptions = {'testEndpoint': 'myDesc'};

            server.inject('/swagger', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(200);
                expect(res.result).to.exist.and.to.have.property('swaggerVersion', '1.2');
                expect(res.result).to.have.deep.property('apis[0].path', '/serverDescription');
                expect(res.result).to.have.deep.property('apis[0].description', 'myDesc2');
                done();
            });
        });
    });


    describe('apiDeclaration', function() {
        var server;
        var pluginOptions = {
            protocol: 'joi',
            host: 'hapi:123',
            descriptions: {
                'serverDescription': 'myDesc2'
            }
        };

        lab.beforeEach(function(done) {
            server = new Hapi.Server();
            server.connection({port: 80});
            server.register({
                register: index,
                options: pluginOptions
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        lab.afterEach(function(done) {
            done();
        });

        it('404', function(done) {
            server.inject('/swagger/list?path=/404', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(404);
                expect(res.result).to.exist.and.to.have.property('statusCode', 404);
                done();
            });
        });

        it('proper config', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {}));
            server.inject('/swagger/list?path=/testEndpoint', function(res) {
                expect(res.result).to.have.deep.property('apis[0].operations[0]');
                done();
            });
        });

        it('with models', function(done) {
            var routeConfig = Hoek.merge(Hoek.clone(baseRoute), {
                method: 'POST',
                path: '/withModels/{name}',
                config: {
                    validate: {
                        query: simpleSchema,
                        params: simpleSchema,
                        payload: simpleSchema
                    },
                    handler: function(request, reply) {
                        reply({name: 'hapi-swagger'});
                    },
                    response: {
                        schema: simpleSchema
                    }
                }
            });

            server.route(routeConfig);

            server.inject('/swagger/list?path=/withModels', function(res) {
                expect(res.result).to.exist;
                expect(res.result).to.have.property('swaggerVersion', '1.2');
                expect(res.result).to.have.property('resourcePath', '/withModels');
                expect(res.result).to.have.property('basePath', pluginOptions.protocol + '://' + pluginOptions.host);
                expect(res.result.apis).to.have.length(1);
                expect(res.result.apis[0].path).to.eql('/withModels/{name}');
                var operations = res.result.apis[0].operations;
                expect(operations).to.have.length(1);

                var operation = res.result.apis[0].operations[0];
                expect(operation).to.have.property('method', 'POST');
                expect(operation.parameters).to.have.length(3);
                expect(operation.type).to.be.eql('SimpleTestModel');
                expect(res.result.models).to.have.property('SimpleTestModel');

                done();
            });
        });
    });

    describe('apiDeclaration with stripPrefix', function() {
        var server;
        var pluginOptions = {
            protocol: 'joi',
            host: 'hapi:123',
            stripPrefix: '/api',
            descriptions: {
                'serverDescription': 'myDesc2'
            }
        };

        lab.beforeEach(function(done) {
            server = new Hapi.Server();
            server.connection({port: 80});
            server.register({
                register: index,
                options: pluginOptions
            }, function(err) {
                expect(err).to.not.exist;
                done();
            });
        });

        lab.afterEach(function(done) {
            done();
        });

        it('404', function(done) {
            server.inject('/swagger/list?path=/404', function(res) {
                expect(res.statusCode).to.exist.and.to.eql(404);
                expect(res.result).to.exist.and.to.have.property('statusCode', 404);
                done();
            });
        });

        it('proper config', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {path: '/api' + baseRoute.path}));
            server.inject('/swagger/list?path=/testEndpoint', function(res) {
                expect(res.result).to.have.deep.property('apis[0].operations[0]');
                done();
            });
        });

        it('with not existing tags', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {path: '/api' + baseRoute.path}));
            server.inject('/swagger/list?tags=abc&path=/testEndpoint', function(res) {
                expect(res.result).to.have.property('statusCode', 404);
                done();
            });
        });

        it('with existing tags', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {path: '/api' + baseRoute.path}));
            server.inject('/swagger/list?tags=test&path=/testEndpoint', function(res) {
                expect(res.result).to.have.deep.property('apis[0].operations[0]');
                done();
            });
        });

        it('proper config', function(done) {
            server.route(Hoek.merge(Hoek.clone(baseRoute), {path: '/api' + baseRoute.path}));
            server.inject('/swagger/list?path=/testEndpoint', function(res) {
                expect(res.result).to.have.deep.property('apis[0].operations[0]');
                done();
            });
        });

        it('with models', function(done) {
            var routeConfig = Hoek.merge(Hoek.clone(baseRoute), {
                method: 'POST',
                path: '/api/withModels/{name}',
                config: {
                    validate: {
                        query: simpleSchema,
                        params: simpleSchema,
                        payload: simpleSchema
                    },
                    handler: function(request, reply) {
                        reply({name: 'hapi-swagger'});
                    },
                    response: {
                        schema: simpleSchema
                    }
                }
            });

            server.route(routeConfig);

            server.inject('/swagger/list?path=/withModels', function(res) {
                expect(res.result).to.exist;
                expect(res.result).to.have.property('swaggerVersion', '1.2');
                expect(res.result).to.have.property('resourcePath', '/withModels');
                expect(res.result).to.have.property('basePath', pluginOptions.protocol + '://' + pluginOptions.host + '/api');
                expect(res.result.apis).to.have.length(1);
                expect(res.result.apis[0].path).to.eql('/withModels/{name}');
                var operations = res.result.apis[0].operations;
                expect(operations).to.have.length(1);

                var operation = res.result.apis[0].operations[0];
                expect(operation).to.have.property('method', 'POST');
                expect(operation.parameters).to.have.length(3);
                expect(operation.type).to.be.eql('SimpleTestModel');
                expect(res.result.models).to.have.property('SimpleTestModel');

                done();
            });
        });
    });
});
