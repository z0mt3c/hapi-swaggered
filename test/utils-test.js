var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var Code = require('code');
var expect = Code.expect;
var Joi = require('joi');
var utils = require('../lib/utils');
var _ = require('lodash');

describe('utils', function() {
    describe('getDescription', function() {
        it('#1', function(done) {
            Code.expect(utils.getDescription(null, 'test')).to.equal(undefined);
            Code.expect(utils.getDescription(null, null)).to.equal(undefined);
            Code.expect(utils.getDescription({
                descriptions: null
            }, 'Test')).to.equal(undefined);
            Code.expect(utils.getDescription({
                descriptions: {
                    test: 'Test'
                }
            }, '/test')).to.equal('Test');
            Code.expect(utils.getDescription({
                descriptions: {
                    test: 'Test'
                }
            }, 'test')).to.equal('Test');
            Code.expect(utils.getDescription({
                descriptions: {
                    test: 'Test'
                }
            }, null)).to.equal(undefined);
            done();
        });
    });

    describe('getRequestConnection', function() {
        it('#1', function(done) {
            expect(utils.getRequestConnection({connection: 'a', server: 'b'})).to.equal('a');
            expect(utils.getRequestConnection({server: 'b'})).to.equal('b');
            expect(utils.getRequestConnection({})).to.not.exist();
            done();
        });
    });

    describe('getRouteModifiers', function() {
        it('#1', function(done) {
            expect(utils.getRoutesModifiers({config: 'test'})).to.equal('test');
            expect(utils.getRoutesModifiers({realm: {modifiers: 'test'}})).to.equal('test');
            expect(utils.getRoutesModifiers({})).to.not.exist();
            done();
        });
    });

    describe('firstCharToUpperCase', function() {
        it('#1', function(done) {
            Code.expect(utils.firstCharToUpperCase(null)).to.equal(null);
            Code.expect(utils.firstCharToUpperCase('')).to.equal('');
            Code.expect(utils.firstCharToUpperCase('a')).to.equal('A');
            Code.expect(utils.firstCharToUpperCase('joi')).to.equal('Joi');
            done();
        });
    });

    describe('getCurrentSettings', function() {
        it('#1', function(done) {
            var settings = {
                source: 'plugin',
                settings: {
                    plugin: true
                }
            };
            var serverSettings = {
                source: 'server',
                settings: {
                    server: true
                }
            };
            Code.expect(utils.getCurrentSettings(null)).to.equal(null);
            Code.expect(utils.getCurrentSettings(settings)).to.equal(settings);
            Code.expect(utils.getCurrentSettings(settings, serverSettings)).to.deep.equal({
                source: 'server',
                settings: {
                    plugin: true,
                    server: true
                }
            });
            done();
        });
    });

    describe('stripRoutesPrefix', function() {
        it('#1', function(done) {
            Code.expect(utils.stripRoutesPrefix(null)).to.be.null;
            Code.expect(utils.stripRoutesPrefix([])).to.have.length(0);
            Code.expect(utils.stripRoutesPrefix([{
                path: '/api/test'
            }], '/api')).to.have.length(1);
            Code.expect(utils.stripRoutesPrefix([{
                path: '/api/test'
            }], '/test')).to.have.length(0);
            // empty route path will be stripped - correct?
            Code.expect(utils.stripRoutesPrefix([{
                path: '/api'
            }], '/api')).to.have.length(0);
            done();
        });
    });

    describe('generateNameFromSchema', function() {
        it('#1', function(done) {
            Code.expect(utils.generateNameFromSchema({
                _inner: {
                    children: [{
                        key: 'test'
                    }, {
                        key: 'test2'
                    }]
                }
            })).to.deep.equal('TestTest2Model');

            Code.expect(utils.generateNameFromSchema({
                _inner: {
                    children: [{
                        key: 'test'
                    }]
                }
            })).to.deep.equal('TestModel');

            Code.expect(utils.generateNameFromSchema({})).to.deep.equal('EmptyModel');
            Code.expect(utils.generateNameFromSchema(null)).to.deep.equal('EmptyModel');

            done();
        });

        it('#2 Integration', function(done) {
            var schema = Joi.object().keys({
                name: Joi.string(),
                email: Joi.string()
            });

            Code.expect(utils.generateNameFromSchema(schema)).to.deep.equal('NameEmailModel');
            Code.expect(utils.generateNameFromSchema(Joi.object().keys({}))).to.deep.equal('EmptyModel');
            Code.expect(utils.generateNameFromSchema(Joi.object())).to.deep.equal('EmptyModel');
            Code.expect(utils.generateNameFromSchema(Joi.array())).to.deep.equal('Array');
            Code.expect(utils.generateNameFromSchema(Joi.array().items(Joi.string()))).to.deep.equal('Array');

            done();
        });
    });

    it('filterRoutesByRequiredTags', function(done) {
        var routes = [{
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['Hapi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['api', 'Hapi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['api', 'Joi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: 'Joi'
            }
        }, {
            path: '/dev',
            method: 'post',
            settings: {}
        }, {
            path: '/dev',
            method: 'get'
        }];

        Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi'])).to.have.length(2);
        Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi', 'api'])).to.have.length(1);
        //TODO: hm?
        Code.expect(utils.filterRoutesByRequiredTags(routes, [])).to.have.length(6);
        Code.expect(utils.filterRoutesByRequiredTags(routes, null)).to.have.length(6);

        done();
    });


    it('filterRoutesByTagSelection', function(done) {
        var routes = [{
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['Hapi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['api', 'Hapi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: ['api', 'Joi']
            }
        }, {
            path: '/dev/null',
            method: 'get',
            settings: {
                tags: 'Joi'
            }
        }, {
            path: '/dev',
            method: 'post',
            settings: {}
        }, {
            path: '/dev',
            method: 'get'
        }];

        Code.expect(utils.filterRoutesByTagSelection(routes, [], [])).to.have.length(6);
        Code.expect(utils.filterRoutesByTagSelection(routes, null, [])).to.have.length(6);
        Code.expect(utils.filterRoutesByTagSelection(routes, [], null)).to.have.length(6);
        Code.expect(utils.filterRoutesByTagSelection(routes, null, null)).to.have.length(6);
        Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], [])).to.have.length(2);
        Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], ['api'])).to.have.length(1);
        Code.expect(utils.filterRoutesByTagSelection(routes, [], ['api'])).to.have.length(4);

        done();
    });


    describe('parseTags', function() {
        it('#1', function(done) {
            Code.expect(utils.parseTags(null)).to.deep.equal(null);
            Code.expect(utils.parseTags('')).to.deep.equal(null);
            Code.expect(utils.parseTags([])).to.deep.equal(null);
            Code.expect(utils.parseTags(['api'])).to.deep.equal({
                included: ['api'],
                excluded: []
            });
            Code.expect(utils.parseTags(['api'].join(','))).to.deep.equal({
                included: ['api'],
                excluded: []
            });
            Code.expect(utils.parseTags(['+api'])).to.deep.equal({
                included: ['api'],
                excluded: []
            });
            Code.expect(utils.parseTags(['+api'].join(','))).to.deep.equal({
                included: ['api'],
                excluded: []
            });
            Code.expect(utils.parseTags(['-api'])).to.deep.equal({
                included: [],
                excluded: ['api']
            });
            Code.expect(utils.parseTags(['-api'].join(','))).to.deep.equal({
                included: [],
                excluded: ['api']
            });
            Code.expect(utils.parseTags(['-api', '+beta'])).to.deep.equal({
                included: ['beta'],
                excluded: ['api']
            });
            Code.expect(utils.parseTags(['-api', '+beta'].join(','))).to.deep.equal({
                included: ['beta'],
                excluded: ['api']
            });
            Code.expect(utils.parseTags(['+api', '+beta'])).to.deep.equal({
                included: ['api', 'beta'],
                excluded: []
            });
            Code.expect(utils.parseTags(['+api', '+beta'].join(','))).to.deep.equal({
                included: ['api', 'beta'],
                excluded: []
            });
            done();
        });
    });

    describe('filterRoutesByPrefix', function() {
        it('#1', function(done) {
            var extractAPIKeys = utils.filterRoutesByPrefix([{
                path: '/',
                method: 'get'
            }, {
                path: '/dev',
                method: 'post'
            }, {
                path: '/dev',
                method: 'get'
            }, {
                path: '/dev/null',
                method: 'get'
            }], 'dev');

            Code.expect(extractAPIKeys).to.deep.equal([{
                path: '/dev',
                method: 'post'
            }, {
                path: '/dev',
                method: 'get'
            }, {
                path: '/dev/null',
                method: 'get'
            }]);

            done();
        });
    });

    describe('groupRoutesByPath', function() {
        it('#1', function(done) {
            var extractAPIKeys = utils.groupRoutesByPath([{
                path: '/',
                method: 'get'
            }, {
                path: '/dev',
                method: 'post'
            }, {
                path: '/dev',
                method: 'get'
            }, {
                path: '/dev/null',
                method: 'get'
            }]);

            Code.expect(extractAPIKeys).to.deep.equal({
                '/': [{
                    path: '/',
                    method: 'get'
                }],
                '/dev': [{
                    path: '/dev',
                    method: 'post'
                }, {
                    path: '/dev',
                    method: 'get'
                }],
                '/dev/null': [{
                    path: '/dev/null',
                    method: 'get'
                }]
            });
            done();
        });
    });

    describe('extractAPIKeys', function() {
        it('#1', function(done) {
            var extractAPIKeys = utils.extractAPIKeys([{
                path: '/',
                method: 'get'
            }, {
                path: '/dev',
                method: 'post'
            }, {
                path: '/dev',
                method: 'get'
            }, {
                path: '/dev/null',
                method: 'get'
            }]);

            Code.expect(extractAPIKeys).to.deep.equal(['/dev']);
            done();
        });

        it('#2', function(done) {
            var extractAPIKeys = utils.extractAPIKeys([{
                path: '/'
            }, {
                path: '/zdsa'
            }, {
                path: '/dev'
            }, {
                path: '/asdf'
            }, {
                path: '/asdf'
            }, {
                path: '/dev/null'
            }]);

            Code.expect(extractAPIKeys).to.deep.equal(['/asdf', '/dev', '/zdsa']);
            done();
        });
    });

    describe('generateFallbackName', function() {
        it('#1', function(done) {
            Code.expect(utils.generateFallbackName(null)).to.equal(null);
            Code.expect(utils.generateFallbackName(undefined)).to.equal(null);
            Code.expect(utils.generateFallbackName('')).to.equal(null);
            Code.expect(utils.generateFallbackName('Model')).to.equal('Model_2');
            Code.expect(utils.generateFallbackName('Model_2')).to.equal('Model_3');
            Code.expect(utils.generateFallbackName('Model_999999')).to.equal('Model_1000000');

            done();
        });
    });

    describe('generateRouteNickname', function() {
        it('#1', function(done) {
            Code.expect(utils.generateRouteNickname({method:'get', path: '/path/to/{somthing}'})).to.equal('get_path_to__somthing_');
            done();
        });
    });

    describe('isPrimitiveSwaggerType', function() {
        it('#1', function(done) {
            _.each(['integer', 'number', 'string', 'boolean', 'string'], function(type) {
                Code.expect(utils.isPrimitiveSwaggerType(type)).to.equal(true);
            });

            Code.expect(utils.isPrimitiveSwaggerType(null)).to.equal(false);
            Code.expect(utils.isPrimitiveSwaggerType(undefined)).to.equal(false);
            Code.expect(utils.isPrimitiveSwaggerType('')).to.equal(false);
            Code.expect(utils.isPrimitiveSwaggerType('asdf123')).to.equal(false);

            done();
        });
    });

    describe('setNotEmpty', function() {
        it('#1', function(done) {
            Code.expect(utils.setNotEmpty({}, 'key', 'value').key).to.be.equal('value');
            Code.expect(utils.setNotEmpty({}, 'key', 'value').key).to.be.equal('value');
            Code.expect(utils.setNotEmpty({}, 'key', undefined).key).not.to.exist();
            Code.expect(utils.setNotEmpty({}, 'key', null).key).not.to.exist();
            Code.expect(utils.setNotEmpty({}, 'key', []).key).not.to.exist();
            done();
        });
    });

    describe('getMeta', function() {
        it('#1', function(done) {
            Code.expect(utils.getMeta(Joi.object().meta({className: 'myClassName'}), 'className')).to.be.equal('myClassName');
            Code.expect(utils.getMeta(undefined, 'className')).to.be.equal(undefined);
            Code.expect(utils.getMeta(null, 'className')).to.be.equal(undefined);
            done();
        });
    });
});
