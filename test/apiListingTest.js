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
        var list = apiLister([], {});

        expect(list).to.exist;
        expect(list).to.be.eql([ { path: 'hapi', description: 'MyTestDescription' } ]);

        //TODO: joi validate!

        done();
    });
});