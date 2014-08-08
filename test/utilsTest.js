var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var Joi = require('joi');
var utils = require('../lib/utils');
var _ = require('lodash');

describe('utils', function () {
    describe('getDescription', function () {
        it('#1', function (done) {
            Lab.expect(utils.getDescription(null, 'test')).to.equal(undefined);
            Lab.expect(utils.getDescription(null, null)).to.equal(undefined);
            Lab.expect(utils.getDescription({ descriptions: null }, 'Test')).to.equal(undefined);
            Lab.expect(utils.getDescription({ descriptions: { test: 'Test' }}, '/test')).to.equal('Test');
            Lab.expect(utils.getDescription({ descriptions: { test: 'Test' }}, 'test')).to.equal('Test');
            Lab.expect(utils.getDescription({ descriptions: { test: 'Test' }}, null)).to.equal(undefined);
            done();
        });
    });
    describe('firstCharToUpperCase', function () {
        it('#1', function (done) {
            Lab.expect(utils.firstCharToUpperCase(null)).to.equal(null);
            Lab.expect(utils.firstCharToUpperCase('')).to.equal('');
            Lab.expect(utils.firstCharToUpperCase('a')).to.equal('A');
            Lab.expect(utils.firstCharToUpperCase('joi')).to.equal('Joi');
            done();
        });
    });

    describe('extractBaseHost', function () {
        it('#1', function (done) {
            Lab.expect(utils.extractBaseHost({ protocol: 'hapi' }, { headers: { }})).to.equal('hapi://localhost');
            Lab.expect(utils.extractBaseHost({ protocol: 'hapi', host: 'abc' }, { headers: { host: 'localhost' }})).to.equal('hapi://abc');
            Lab.expect(utils.extractBaseHost({ protocol: 'hapi' }, { headers: { host: 'localhost' }})).to.equal('hapi://localhost');
            Lab.expect(utils.extractBaseHost({ protocol: 'hapi' }, { headers: { host: 'localhost:9000' }})).to.equal('hapi://localhost:9000');
            Lab.expect(utils.extractBaseHost({ protocol: null }, { headers: { host: 'localhost:9000' } })).to.equal('http://localhost:9000');
            Lab.expect(utils.extractBaseHost({ protocol: null }, { server: { info: { protocol: 'hapi' } }, headers: { host: 'localhost:9000' } })).to.equal('hapi://localhost:9000');
            done();
        });
    });

    describe('generateNameFromSchema', function () {
        it('#1', function (done) {
            Lab.expect(utils.generateNameFromSchema({ _inner: { children: [
                { key: 'test' },
                { key: 'test2' }
            ]}})).to.eql('TestTest2Model');

            Lab.expect(utils.generateNameFromSchema({ _inner: { children: [
                { key: 'test' }
            ]}})).to.eql('TestModel');

            Lab.expect(utils.generateNameFromSchema({})).to.eql('EmptyModel');
            Lab.expect(utils.generateNameFromSchema(null)).to.eql('EmptyModel');

            done();
        });

        it('#2 Integration', function (done) {
            var schema = Joi.object().keys({
                name: Joi.string(),
                email: Joi.string()
            });

            Lab.expect(utils.generateNameFromSchema(schema)).to.eql('NameEmailModel');
            Lab.expect(utils.generateNameFromSchema(Joi.object().keys({}))).to.eql('EmptyModel');
            Lab.expect(utils.generateNameFromSchema(Joi.object())).to.eql('EmptyModel');
            Lab.expect(utils.generateNameFromSchema(Joi.array())).to.eql('ArrayModel');
            Lab.expect(utils.generateNameFromSchema(Joi.array().includes(Joi.string()))).to.eql('StringArrayModel');

            done();
        });
    });

    it('filterRoutesByRequiredTags', function (done) {
        var routes = [
            { path: '/dev/null', method: 'get', settings: { tags: ['Hapi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: ['api', 'Hapi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: ['api', 'Joi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: 'Joi' } },
            { path: '/dev', method: 'post', settings: {}},
            { path: '/dev', method: 'get'}
        ];

        Lab.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi'])).to.have.length(2);
        Lab.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi', 'api'])).to.have.length(1);
        //TODO: hm?
        Lab.expect(utils.filterRoutesByRequiredTags(routes, [])).to.have.length(6);
        Lab.expect(utils.filterRoutesByRequiredTags(routes, null)).to.have.length(6);

        done();
    });


    it('filterRoutesByTagSelection', function (done) {
        var routes = [
            { path: '/dev/null', method: 'get', settings: { tags: ['Hapi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: ['api', 'Hapi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: ['api', 'Joi'] } },
            { path: '/dev/null', method: 'get', settings: { tags: 'Joi' } },
            { path: '/dev', method: 'post', settings: {}},
            { path: '/dev', method: 'get'}
        ];

        Lab.expect(utils.filterRoutesByTagSelection(routes, [], [])).to.have.length(6);
        Lab.expect(utils.filterRoutesByTagSelection(routes, null, [])).to.have.length(6);
        Lab.expect(utils.filterRoutesByTagSelection(routes, [], null)).to.have.length(6);
        Lab.expect(utils.filterRoutesByTagSelection(routes, null, null)).to.have.length(6);
        Lab.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], [])).to.have.length(2);
        Lab.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], ['api'])).to.have.length(1);
        Lab.expect(utils.filterRoutesByTagSelection(routes, [], ['api'])).to.have.length(4);

        done();
    });


    describe('parseTags', function () {
        it('#1', function (done) {
            Lab.expect(utils.parseTags(null)).to.eql(null);
            Lab.expect(utils.parseTags('')).to.eql(null);
            Lab.expect(utils.parseTags([])).to.eql(null);
            Lab.expect(utils.parseTags(['api'])).to.eql({ included: ['api'], excluded: [] });
            Lab.expect(utils.parseTags(['api'].join(','))).to.eql({ included: ['api'], excluded: [] });
            Lab.expect(utils.parseTags(['+api'])).to.eql({ included: ['api'], excluded: [] });
            Lab.expect(utils.parseTags(['+api'].join(','))).to.eql({ included: ['api'], excluded: [] });
            Lab.expect(utils.parseTags(['-api'])).to.eql({ included: [], excluded: ['api'] });
            Lab.expect(utils.parseTags(['-api'].join(','))).to.eql({ included: [], excluded: ['api'] });
            Lab.expect(utils.parseTags(['-api','+beta'])).to.eql({ included: ['beta'], excluded: ['api'] });
            Lab.expect(utils.parseTags(['-api','+beta'].join(','))).to.eql({ included: ['beta'], excluded: ['api'] });
            Lab.expect(utils.parseTags(['+api','+beta'])).to.eql({ included: ['api','beta'], excluded: [] });
            Lab.expect(utils.parseTags(['+api','+beta'].join(','))).to.eql({ included: ['api','beta'], excluded: [] });
            done();
        });
    });

    describe('filterRoutesByPrefix', function () {
        it('#1', function (done) {
            var extractAPIKeys = utils.filterRoutesByPrefix([
                { path: '/', method: 'get' },
                { path: '/dev', method: 'post'},
                { path: '/dev', method: 'get'},
                { path: '/dev/null', method: 'get' }
            ], 'dev');

            Lab.expect(extractAPIKeys).to.eql([
                { path: '/dev', method: 'post'},
                { path: '/dev', method: 'get'},
                { path: '/dev/null', method: 'get' }
            ]);

            done();
        });
    });

    describe('groupRoutesByPath', function () {
        it('#1', function (done) {
            var extractAPIKeys = utils.groupRoutesByPath([
                { path: '/', method: 'get' },
                { path: '/dev', method: 'post'},
                { path: '/dev', method: 'get'},
                { path: '/dev/null', method: 'get' }
            ]);

            Lab.expect(extractAPIKeys).to.eql({
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
            done();
        });
    });

    describe('extractAPIKeys', function () {
        it('#1', function (done) {
            var extractAPIKeys = utils.extractAPIKeys([
                { path: '/', method: 'get' },
                { path: '/dev', method: 'post'},
                { path: '/dev', method: 'get'},
                { path: '/dev/null', method: 'get' }
            ]);

            Lab.expect(extractAPIKeys).to.eql(['/dev']);
            done();
        });

        it('#2', function (done) {
            var extractAPIKeys = utils.extractAPIKeys([
                { path: '/' },
                { path: '/zdsa' },
                { path: '/dev' },
                { path: '/asdf' },
                { path: '/asdf' },
                { path: '/dev/null' }
            ]);

            Lab.expect(extractAPIKeys).to.eql(['/asdf', '/dev', '/zdsa']);
            done();
        });
    });

    describe('generateFallbackName', function () {
        it('#1', function (done) {
            Lab.expect(utils.generateFallbackName(null)).to.equal(null);
            Lab.expect(utils.generateFallbackName(undefined)).to.equal(null);
            Lab.expect(utils.generateFallbackName('')).to.equal(null);
            Lab.expect(utils.generateFallbackName('Model')).to.equal('Model_2');
            Lab.expect(utils.generateFallbackName('Model_2')).to.equal('Model_3');
            Lab.expect(utils.generateFallbackName('Model_999999')).to.equal('Model_1000000');

            done();
        });
    });
    describe('isPrimitiveSwaggerType', function () {
        it('#1', function (done) {
            _.each(['integer', 'number', 'string', 'boolean', 'string'], function (type) {
                Lab.expect(utils.isPrimitiveSwaggerType(type)).to.equal(true);
            });

            Lab.expect(utils.isPrimitiveSwaggerType(null)).to.equal(false);
            Lab.expect(utils.isPrimitiveSwaggerType(undefined)).to.equal(false);
            Lab.expect(utils.isPrimitiveSwaggerType('')).to.equal(false);
            Lab.expect(utils.isPrimitiveSwaggerType('asdf123')).to.equal(false);

            done();
        });
    });
    describe('setNotEmpty', function () {
        it('#1', function (done) {
            Lab.expect(utils.setNotEmpty({}, 'key', 'value')).to.have.property('key', 'value');
            Lab.expect(utils.setNotEmpty({}, 'key', 'value')).to.have.property('key', 'value');
            Lab.expect(utils.setNotEmpty({}, 'key', undefined)).not.to.have.property('key');
            Lab.expect(utils.setNotEmpty({}, 'key', null)).not.to.have.property('key');
            Lab.expect(utils.setNotEmpty({}, 'key', [])).not.to.have.property('key');
            done();
        });
    });
});