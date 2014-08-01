var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var Joi = require('joi');
var Nipple = require('nipple');

var schema = require('../lib/schema');
var generator = require('../lib/generator');

var petstoreListing = 'http://petstore.swagger.wordnik.com/api/api-docs';
var petApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/pet';
var userApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/user';
var storeApiDeclaration = 'http://petstore.swagger.wordnik.com/api/api-docs/store';

describe('Schema integration test against official petstore', function () {
    it('ResourceListing', function (done) {
        Nipple.request('GET', petstoreListing, { }, function (err, res) {
            expect(err).to.be.null;
            Nipple.read(res, { json: true }, function (err, specs) {
                expect(err).to.be.null;
                expect(specs).to.exist;

                Joi.validate(specs, schema.ResourceListing, function (err, value) {
                    expect(err).to.be.null;
                    expect(value).to.exist;
                    done();
                });
            });
        });
    });

    describe('APIDeclaration', function () {
        it('Pet', function (done) {
            Nipple.request('GET', petApiDeclaration, { }, function (err, res) {
                expect(err).to.be.null;
                Nipple.read(res, { json: true }, function (err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function (err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });

        it('User', function (done) {
            Nipple.request('GET', userApiDeclaration, { }, function (err, res) {
                expect(err).to.be.null;
                Nipple.read(res, { json: true }, function (err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function (err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });

        it('Store', function (done) {
            Nipple.request('GET', storeApiDeclaration, { }, function (err, res) {
                expect(err).to.be.null;
                Nipple.read(res, { json: true }, function (err, specs) {
                    expect(err).to.be.null;
                    expect(specs).to.exist;

                    Joi.validate(specs, schema.APIDeclaration, function (err, value) {
                        expect(err).to.be.null;
                        expect(value).to.exist;
                        done();
                    });
                });
            });
        });
    });
});