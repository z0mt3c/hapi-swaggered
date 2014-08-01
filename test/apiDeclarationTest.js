var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var Joi = require('joi');
var sinon = require('sinon');

var apiDeclaration = require('../lib/apiDeclaration');
var utils = require('../lib/utils');

describe('apiDeclaration', function () {
    var filterRoutesByTags, filterRoutesByPrefix, groupRoutesByPath;

    Lab.beforeEach(function (done) {
        filterRoutesByTags = sinon.spy(utils, 'filterRoutesByTags');
        filterRoutesByPrefix = sinon.spy(utils, 'filterRoutesByPrefix');
        groupRoutesByPath = sinon.spy(utils, 'groupRoutesByPath');
        done();
    });

    Lab.afterEach(function (done) {
        utils.filterRoutesByTags.restore();
        utils.filterRoutesByPrefix.restore();
        utils.groupRoutesByPath.restore();
        done();
    });

    it('empty', function (done) {
        var settings = {};
        var apiDeclarator = apiDeclaration(settings);
        var routingTable = [],
            apiKey = 'Test',
            models,
            tags;

        var list = apiDeclarator(routingTable, apiKey, models, tags);

        expect(list).to.exist;
        expect(list).to.be.empty;

        //TODO: joi validate!

        expect(filterRoutesByTags.callCount).to.be.eql(1);
        expect(filterRoutesByTags.calledWithExactly(settings, tags, routingTable)).to.be.ok;
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(filterRoutesByPrefix.calledWithExactly(routingTable, apiKey)).to.be.ok;
        expect(apiDeclarator.bind(apiDeclarator, routingTable, null, models, tags)).to.throw('apiKey not allowed to be null nor empty');
        expect(filterRoutesByTags.callCount).to.be.eql(1);
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);

        done();
    });

    it('only routes: no params, no query, no payload, no response', function (done) {
        var settings = { mySettings: true };
        var apiDeclarator = apiDeclaration(settings);
        var routes = [],
            apiKey = 'dev',
            models = {},
            tags = null;

        var routes = [
            { path: '/', method: 'get' },
            { path: '/dev', method: 'post'},
            { path: '/dev', method: 'get'},
            { path: '/dev/null', method: 'get' }
        ];

        var list = apiDeclarator(routes, apiKey, models, tags);

        expect(filterRoutesByTags.callCount).to.be.eql(1);
        expect(filterRoutesByTags.calledWithExactly(settings, tags, routes)).to.be.ok;
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(filterRoutesByPrefix.calledWithExactly(routes, apiKey)).to.be.ok;
        expect(groupRoutesByPath.callCount).to.be.eql(1);

        var filteredRoutes = [
            { path: '/dev', method: 'post' },
            { path: '/dev', method: 'get' },
            { path: '/dev/null', method: 'get' }
        ];

        expect(groupRoutesByPath.calledWithExactly(filteredRoutes)).to.be.ok;

        expect(list).to.be.eql([
            { path: "/dev", operations: [
                { method: "GET", nickname: "get_dev", parameters: [], type: "void" },
                { method: "POST", nickname: "post_dev", parameters: [], type: "void" }
            ]},
            { path: "/dev/null", operations: [
                { method: "GET", nickname: "get_dev_null", parameters: [], type: "void" }
            ]}
        ]);

        expect(list).to.have.length(2);

        done();
    });

    it('deprecation tag', function (done) {
        var settings = { mySettings: true };
        var apiDeclarator = apiDeclaration(settings);
        var list = apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['deprecated'] }},
            { path: '/dev/normal', method: 'post' }
        ], 'dev', null, null);
        expect(list).to.have.length(2);
        expect(list[0].operations).to.have.length(1).and.have.deep.property('[0].deprecated', true);
        expect(list[1].operations).to.have.length(1).and.not.have.deep.property('[0].deprecated');
        done();
    });

    it('api description', function (done) {
        expect(apiDeclaration({})([
            { path: '/dev', method: 'post' }
        ], 'dev', null, null))
            .to.have.length(1).and.not.to.have.deep.property('[0].description');

        expect(apiDeclaration({ descriptions: { dev: 'test' }})([
            { path: '/dev', method: 'post' }
        ], 'dev', null, null))
            .to.have.length(1).and.to.have.deep.property('[0].description').that.to.eql('test');

        expect(apiDeclaration({ descriptions: { dev: 'test' }})([
            { path: '/dev', method: 'post' }
        ], 'dev', null, null, { descriptions: { dev: 'test2'}}))
            .to.have.length(1).and.to.have.deep.property('[0].description').that.to.eql('test2');

        done();
    });

    it('operation grouping', function (done) {
        var settings = { mySettings: true };
        var apiDeclarator = apiDeclaration(settings);
        var list = apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['deprecated'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, null);
        expect(list).to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);
        done();
    });

    it('tag filtering', function (done) {
        var settings = { mySettings: true };
        var apiDeclarator = apiDeclaration(settings);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev', 'api']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, 'dev,api'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(2);

        done();
    });

    it('requiredTag', function (done) {
        var settings = { requiredTag: 'api' };
        var apiDeclarator = apiDeclaration(settings);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(0);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev', 'api'] }},
            { path: '/dev', method: 'get' }
        ], 'dev', null, 'dev'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(0);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev', 'api'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, ['dev', 'api']))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        expect(apiDeclarator([
            { path: '/dev', method: 'post', settings: { tags: ['dev'] }},
            { path: '/dev', method: 'get', settings: { tags: ['api'] } }
        ], 'dev', null, 'dev,api'))
            .to.have.length(1).and.have.deep.property('[0].operations').that.have.length(1);

        done();
    });
});