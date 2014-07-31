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
        groupRoutesByPath = sinon.stub(utils, 'groupRoutesByPath');
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
        var routingTable = [],
            apiKey = 'Test',
            models,
            tags;

        groupRoutesByPath.returns({
            '/': [
                { path: '/', method: 'get' }
            ],
            '/dev': [
                { path: '/dev', method: 'post'},
                { path: '/dev', method: 'get'}
            ],
            '/dev/null': [
                { path: '/dev/null', method: 'get' }
            ]
        });

        var list = apiDeclarator(routingTable, apiKey, models, tags);

        expect(filterRoutesByTags.callCount).to.be.eql(1);
        expect(filterRoutesByPrefix.callCount).to.be.eql(1);
        expect(list).to.have.length(3);

        //TODO: joi validate!

        done();
    });
});