var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var Joi = require('joi');
var Wreck = require('wreck');

var schema = require('../lib/schema');
var petstoreListing = 'http://petstore.swagger.wordnik.com/api/api-docs';
var petApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/pet';
var userApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/user';
var storeApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/store';

describe('Schema integration test against official petstore', function() {
    it('ResourceListing', function(done) {
        Wreck.request('GET', petstoreListing, {}, function(err, res) {
            expect(err).to.be.null;
            Wreck.read(res, {json: true}, function(err, specs) {
                expect(err).to.be.null;
                expect(specs).to.exist;

                Joi.validate(specs, schema.ResourceListing, function(err, value) {
                    expect(err).to.be.null;
                    expect(value).to.exist;
                    done();
                });
            });
        });
    });

    describe('APIDeclaration', function() {
        it('Pet', function(done) {
            Wreck.request('GET', petApiDeclaration, {}, function(err, res) {
                expect(err).to.be.null;
                Wreck.read(res, {json: true}, function(err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function(err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });

        it('User', function(done) {
            Wreck.request('GET', userApiDeclaration, {}, function(err, res) {
                expect(err).to.be.null;
                Wreck.read(res, {json: true}, function(err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function(err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });

        it('Store', function(done) {
            Wreck.request('GET', storeApiDeclaration, {}, function(err, res) {
                expect(err).to.be.null;
                Wreck.read(res, {json: true}, function(err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function(err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });
    });
});
