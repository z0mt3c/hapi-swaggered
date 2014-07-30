var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var Joi = require('joi');

var utils = require('../lib/utils');

describe('utils', function () {
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
});