var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var Joi = require('joi');
var sinon = require('sinon');

var apiDeclaration = require('../lib/apiDeclaration');
var utils = require('../lib/utils');
var generator = require('../lib/generator');
var schemas = require('../lib/schema');

var simpleJoiSchema = Joi.object().keys({ string: Joi.string() }).options({ className: 'SimpleTestModel'});

describe('apiDeclaration', function () {
    var filterRoutesByPrefix, groupRoutesByPath, createProperties, fromJoiSchema, filterRoutesByRequiredTags, filterRoutesByTagSelection;

    lab.beforeEach(function (done) {
        createProperties = sinon.spy(generator, 'createProperties');
        fromJoiSchema = sinon.spy(generator, 'fromJoiSchema');

        filterRoutesByTagSelection = sinon.spy(utils, 'filterRoutesByTagSelection');
        filterRoutesByRequiredTags = sinon.spy(utils, 'filterRoutesByRequiredTags');
        filterRoutesByPrefix = sinon.spy(utils, 'filterRoutesByPrefix');
        groupRoutesByPath = sinon.spy(utils, 'groupRoutesByPath');

        done();
    });

    lab.afterEach(function (done) {
        generator.createProperties.restore();
        generator.fromJoiSchema.restore();

        utils.filterRoutesByTagSelection.restore();
        utils.filterRoutesByRequiredTags.restore();
        utils.filterRoutesByPrefix.restore();
        utils.groupRoutesByPath.restore();

        done();
    });

    describe('parameters', function () {
        it('params', function (done) {
            var settings = { requiredTag: 'apis' };
            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], validate: { params: simpleJoiSchema }}}
            ], 'dev', null, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].type', 'void');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].type', 'string');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].paramType', 'path');

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('query', function (done) {
            var settings = { requiredTag: 'apis' };

            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], validate: { query: simpleJoiSchema }}}
            ], 'dev', null, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].type', 'void');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].type', 'string');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].paramType', 'query');

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('payload', function (done) {
            var settings = { requiredTag: 'apis' };
            var models = {};

            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], validate: { payload: simpleJoiSchema }}}
            ], 'dev', models, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].type', 'void');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].type', 'SimpleTestModel');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].paramType', 'body');
            expect(models).to.exist.and.to.have.property('SimpleTestModel').that.to.eql({
                id: 'SimpleTestModel',
                type: 'object',
                properties: {
                    string: {
                        required: false,
                        type: 'string'
                    }
                }
            });

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;

                Joi.validate(models, schemas.Models, function (err, value) {
                    expect(err).to.be.null;
                    expect(value).to.exist;
                    done();
                });
            });
        });

        it('payload: application/x-www-form-urlencoded', function (done) {
            var settings = { requiredTag: 'apis' };
            var models = {};

            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], validate: { payload: simpleJoiSchema }, payload: { allow: ['application/x-www-form-urlencoded'] }}}
            ], 'dev', models, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].type', 'void');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].type', 'string');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].paramType', 'form');

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('payload: multipart/form-data', function (done) {
            var settings = { requiredTag: 'apis' };
            var models = {};

            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], validate: { payload: simpleJoiSchema }, payload: { allow: ['multipart/form-data'] }}}
            ], 'dev', models, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].type', 'void');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].type', 'string');
            expect(apis[0]).to.have.deep.property('operations[0].parameters[0].paramType', 'form');

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;
                done();
            });
        });

        it('response', function (done) {
            var settings = { requiredTag: 'apis' };
            var models = {};

            var apis = apiDeclaration(settings, [
                { path: '/dev', method: 'post', settings: { tags: ['apis'], response: { schema: simpleJoiSchema }}}
            ], 'dev', models, null);

            expect(apis).to.have.length(1);
            expect(apis[0]).to.have.deep.property('path', '/dev');
            expect(apis[0]).to.have.deep.property('operations[0].method', 'POST');
            expect(apis[0]).to.have.deep.property('operations[0].parameters').that.have.length(0);
            expect(apis[0]).to.have.deep.property('operations[0].type', 'SimpleTestModel');
            expect(models).to.exist.and.to.have.property('SimpleTestModel').that.to.eql({
                id: 'SimpleTestModel',
                type: 'object',
                properties: {
                    string: {
                        required: false,
                        type: 'string'
                    }
                }
            });

            Joi.validate(apis, Joi.array().includes(schemas.API), function (err, value) {
                expect(err).to.be.null;
                expect(value).to.exist;

                Joi.validate(models, schemas.Models, function (err, value) {
                    expect(err).to.be.null;
                    expect(value).to.exist;
                    done();
                });
            });
        });
    });

    it('empty', function (done) {
        var settings = {};
        var routingTable = [],
            apiKey = 'Test',
            models,
            tags;

        var list = apiDeclaration(settings, routingTable, apiKey, models, tags);

        expect(list).to.exist;
        expect(list).to.be.empty;

        expect(filterRoutesByRequiredTags.callCount).to.be.eql(1);
        expect(filterRoutesByRequiredTags.calledWithExactly(routingTable, tags)).to.be.ok;

        expect(filterRoutesByTagSelection.callCount).to.be.eql(0);

        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(filterRoutesByPrefix.calledWithExactly(routingTable, apiKey)).to.be.ok;

        expect(apiDeclaration.bind(apiDeclaration, routingTable, null, models, tags)).to.throw('apiKey not allowed to be null nor empty');
        expect(filterRoutesByTagSelection.callCount).to.be.eql(0);
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);

        done();
    });

    it('only routes: no params, no query, no payload, no response', function (done) {
        var settings = { mySettings: true };
        var apiKey = 'dev',
            models = {},
            tags = null;

        var routes = [
            { path: '/', method: 'get' },
            { path: '/dev', method: 'post'},
            { path: '/dev', method: 'get'},
            { path: '/dev/null', method: 'get' }
        ];

        var list = apiDeclaration(settings, routes, apiKey, models, tags);

        expect(filterRoutesByRequiredTags.callCount).to.be.eql(1);
        expect(filterRoutesByTagSelection.callCount).to.be.eql(0);
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(groupRoutesByPath.callCount).to.be.eql(1);

        var filteredRoutes = [
            { path: '/dev', method: 'post' },
            { path: '/dev', method: 'get' },
            { path: '/dev/null', method: 'get' }
        ];

        expect(groupRoutesByPath.calledWithExactly(filteredRoutes)).to.be.ok;

        expect(list).to.be.eql([
            { path: '/dev', operations: [
                { method: 'GET', nickname: 'get_dev', parameters: [], type: 'void' },
                { method: 'POST', nickname: 'post_dev', parameters: [], type: 'void' }
            ]},
            { path: '/dev/null', operations: [
                { method: 'GET', nickname: 'get_dev_null', parameters: [], type: 'void' }
            ]}
        ]);

        expect(list).to.have.length(2);

        Joi.validate(list, Joi.array().includes(schemas.API), function (err, value) {
            expect(err).to.be.null;
            expect(value).to.exist;
            done();
        });
    });


    it('only routes: no params, no query, no payload, no response with stripPrefix', function (done) {
        var settings = { mySettings: true, stripPrefix: '/api' };
        var apiKey = 'dev',
            models = {},
            tags = null;

        var routes = [
            { path: '/', method: 'get' },
            { path: '/api', method: 'post'},
            { path: '/api/dev', method: 'post'},
            { path: '/api/dev', method: 'get'},
            { path: '/api/dev/null', method: 'get' }
        ];

        var list = apiDeclaration(settings, routes, apiKey, models, tags);

        expect(filterRoutesByRequiredTags.callCount).to.be.eql(1);
        expect(filterRoutesByTagSelection.callCount).to.be.eql(0);
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(groupRoutesByPath.callCount).to.be.eql(1);

        var filteredRoutes = [
            { path: '/dev', method: 'post' },
            { path: '/dev', method: 'get' },
            { path: '/dev/null', method: 'get' }
        ];

        expect(groupRoutesByPath.calledWithExactly(filteredRoutes)).to.be.ok;

        expect(list).to.be.eql([
            { path: '/dev', operations: [
                { method: 'GET', nickname: 'get_dev', parameters: [], type: 'void' },
                { method: 'POST', nickname: 'post_dev', parameters: [], type: 'void' }
            ]},
            { path: '/dev/null', operations: [
                { method: 'GET', nickname: 'get_dev_null', parameters: [], type: 'void' }
            ]}
        ]);

        expect(list).to.have.length(2);

        Joi.validate(list, Joi.array().includes(schemas.API), function (err, value) {
            expect(err).to.be.null;
            expect(value).to.exist;
            done();
        });
    });

    it('deprecation tag', function (done) {
        var settings = { mySettings: true };
        var list = apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['deprecated'] }},
            { path: '/dev/normal', method: 'post' }
        ], 'dev', null, null);
        expect(list).to.have.length(2);
        expect(list[0].operations).to.have.length(1).and.have.deep.property('[0].deprecated', true);
        expect(list[1].operations).to.have.length(1).and.not.have.deep.property('[0].deprecated');
        done();
    });

    it('api description', function (done) {
        expect(apiDeclaration({}, [
            { path: '/dev', method: 'post' }
        ], 'dev', null, null))
            .to.have.length(1).and.not.to.have.deep.property('[0].description');

        expect(apiDeclaration({ descriptions: { dev: 'test' }}, [
            { path: '/dev', method: 'post' }
        ], 'dev', null, null))
            .to.have.length(1).and.to.have.deep.property('[0].description').that.to.eql('test');

        done();
    });

    it('operation grouping', function (done) {
        var settings = { mySettings: true };
        var list = apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['deprecated'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, null);
        expect(list).to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);
        done();
    });

    it('tag filtering', function (done) {
        var settings = { mySettings: true };

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev', 'api']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, 'dev,api'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);

        done();
    });

    it('requiredTag', function (done) {
        var settings = { requiredTags: ['api'] };

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(0);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev', 'api'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(0);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev', 'api'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev', 'api']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        var apiDeclarations = apiDeclaration(settings, [
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, 'dev,api');
        expect(apiDeclarations)
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        Joi.validate(apiDeclarations, Joi.array().includes(schemas.API), function (err, value) {
            expect(err).to.be.null;
            expect(value).to.exist;
            done();
        });
    });
});