var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var before = lab.before;
var beforeEach = lab.beforeEach;
var after = lab.after;
var afterEach = lab.afterEach;
var Joi = require('joi');
var sinon = require('sinon');

var utils = require('../lib/utils');
var generator = require('../lib/generator');
var _ = require('lodash');


describe('generator', function () {
    describe('newModel', function () {
        describe('complex', function () {
            it('className', function (done) {
                var models = {};
                var schema = Joi.object().keys({}).options({className: 'TestModel'});
                var swaggerSchema = generator.newModel(schema, null, models);

                expect(swaggerSchema).to.be.eql({type: 'TestModel'});
                expect(models).to.have.property('TestModel');
                done();
            });

            it('key', function (done) {
                var models = {};
                var schema = Joi.object().keys({});
                var swaggerSchema = generator.newModel(schema, 'TestModel', models);

                expect(swaggerSchema).to.be.eql({type: 'TestModel'});
                expect(models).to.have.property('TestModel');

                done();
            });

            describe('name generator', function () {
                before(function (done) {
                    var stub = sinon.stub(utils, 'generateNameFromSchema');
                    stub.returns('TestModel');
                    done();
                });

                after(function (done) {
                    utils.generateNameFromSchema.restore();
                    done();
                });

                it('name generator', function (done) {
                    var models = {};
                    var swaggerSchema = generator.newModel(Joi.object().keys({}), null, models);

                    expect(swaggerSchema).to.be.eql({type: 'TestModel'});
                    expect(models).to.have.property('TestModel');

                    done();
                });
            });

            describe('duplicate model name', function () {
                before(function (done) {
                    var stub = sinon.stub(utils, 'generateFallbackName');
                    stub.returns('FallbackName');
                    done();
                });

                after(function (done) {
                    utils.generateFallbackName.restore();
                    done();
                });

                it('equal schema = equal model', function (done) {
                    var models = {};
                    var schema1 = Joi.object().keys({name: Joi.string()}).options({className: 'TestModel'});
                    var schema2 = Joi.object().keys({name: Joi.string()}).options({className: 'TestModel'});
                    var swaggerSchema1 = generator.newModel(schema1, null, models);
                    var swaggerSchema2 = generator.newModel(schema2, null, models);

                    expect(swaggerSchema1).to.be.eql({type: 'TestModel'});
                    expect(swaggerSchema2).to.be.eql({type: 'TestModel'});
                    expect(models).to.have.property('TestModel');
                    expect(_.keys(models).length).to.be.eql(1);
                    done();
                });

                it('not equal schema = new model', function (done) {
                    var models = {};
                    var schema1 = Joi.object().keys({name: Joi.string()}).options({className: 'TestModel'});
                    var schema2 = Joi.object().keys({
                        name: Joi.string(),
                        email: Joi.string()
                    }).options({className: 'TestModel'});
                    var swaggerSchema1 = generator.newModel(schema1, null, models);
                    var swaggerSchema2 = generator.newModel(schema2, null, models);

                    expect(swaggerSchema1).to.be.eql({type: 'TestModel'});
                    expect(swaggerSchema2).to.be.eql({type: 'FallbackName'});
                    expect(models).to.have.property('TestModel');
                    expect(models).to.have.property('FallbackName');
                    expect(_.keys(models).length).to.be.eql(2);
                    done();
                });
            });
        });

        describe('primitive', function () {
            it('swagger type', function (done) {
                var types = ['integer', 'number', 'string', 'boolean'];

                _.each(types, function (type) {
                    expect(generator.newModel({_type: type})).to.be.eql({type: type});
                });

                done();
            });

            it('joi type', function (done) {
                expect(generator.newModel(Joi.number())).to.be.eql({type: 'number'});
                expect(generator.newModel(Joi.number().integer())).to.be.eql({type: 'integer'});
                expect(generator.newModel(Joi.string())).to.be.eql({type: 'string'});
                expect(generator.newModel(Joi.boolean())).to.be.eql({type: 'boolean'});
                done();
            });
        });
    });

    describe('fromJoiSchema', function () {
        describe('rules', function () {
            it('#1: required', function (done) {
                var types = [Joi.string, Joi.number, Joi.object];

                _.each(types, function (type) {
                    var msg = 'Failed for type -> ' + type()._type;
                    expect(generator.fromJoiSchema(type(), null, {})).to.have.property('required', false, msg);
                    expect(generator.fromJoiSchema(type().optional(), null, {})).to.have.property('required', false, msg);
                    expect(generator.fromJoiSchema(type().required(), null, {})).to.have.property('required', true, msg);
                });

                done();
            });

            it('#2: description', function (done) {
                var types = [Joi.string, Joi.number, Joi.object];
                var desc = 'DescriptionText';

                _.each(types, function (type) {
                    var msg = 'Failed for type -> ' + type()._type;
                    expect(generator.fromJoiSchema(type().description(desc), null, {})).to.have.property('description', desc, msg);
                    expect(generator.fromJoiSchema(type(), null, {})).not.to.have.property('description');
                });

                done();
            });

            it('#2: enum', function (done) {
                var enumValuesString = ['Test', 'Test2'];
                var enumValuesNumber = [1, 2];

                expect(generator.fromJoiSchema(Joi.string().valid(enumValuesString), null, {})).to.have.property('enum');
                expect(generator.fromJoiSchema(Joi.string().valid(enumValuesString), null, {})['enum']).to.be.eql(enumValuesString);

                // not sure if this should be valid? https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#433-data-type-fields
                expect(generator.fromJoiSchema(Joi.number().valid(enumValuesNumber), null, {})).to.have.property('enum');
                expect(generator.fromJoiSchema(Joi.number().valid(enumValuesNumber), null, {})['enum']).to.be.eql(enumValuesNumber);

                // Represented by the same structure in the joi schema
                expect(generator.fromJoiSchema(Joi.string().allow(''), null, {})).not.to.have.property('enum');

                done();
            });

            it('#3: minimum / maximum', function (done) {
                expect(generator.fromJoiSchema(Joi.number().min(1), null, {})).to.have.property('minimum', 1);
                expect(generator.fromJoiSchema(Joi.number().max(2), null, {})).to.have.property('maximum', 2);

                expect(generator.fromJoiSchema(Joi.string().min(1), null, {})).to.have.property('minimum', 1);
                expect(generator.fromJoiSchema(Joi.string().max(2), null, {})).to.have.property('maximum', 2);

                done();
            });
        });

        describe('types', function () {
            it('#0: null schema', function (done) {
                var models = {};
                var swaggerSchema = generator.fromJoiSchema(null, null, models);
                expect(swaggerSchema).not.to.exist;
                expect(models).to.be.empty;
                done();
            });

            it('#1: string', function (done) {
                var models = {};
                var swaggerSchema = generator.fromJoiSchema(Joi.string(), null, models);

                var type = 'string';
                expect(swaggerSchema).to.exist;
                expect(swaggerSchema).to.have.property('type', type);
                expect(swaggerSchema).to.eql({
                    required: false,
                    type: type
                });

                done();
            });

            it('#2: number', function (done) {
                var models = {};
                var swaggerSchema = generator.fromJoiSchema(Joi.number(), null, models);
                var type = 'number';

                expect(swaggerSchema).to.exist;
                expect(swaggerSchema).to.have.property('type', type);
                expect(swaggerSchema).to.eql({
                    required: false,
                    type: type
                });

                done();
            });

            it('#3: integer', function (done) {
                var models = {};
                var swaggerSchema = generator.fromJoiSchema(Joi.number().integer(), null, models);
                var type = 'integer';

                expect(swaggerSchema).to.exist;
                expect(swaggerSchema).to.have.property('type', type);
                expect(swaggerSchema).to.eql({
                    required: false,
                    type: type
                });

                done();
            });

            describe('#4: object', function () {
                var newModelStub;

                before(function (done) {
                    newModelStub = sinon.stub(generator, 'newModel');
                    newModelStub.returns({test: true});
                    done();
                });

                after(function (done) {
                    generator.newModel.restore();
                    done();
                });

                it('Merge', function (done) {
                    var models = {};
                    var swaggerSchema = generator.fromJoiSchema(Joi.object(), null, models);

                    expect(swaggerSchema).to.exist;
                    expect(newModelStub.calledWith(Joi.object(), null, models)).to.be.ok;
                    expect(swaggerSchema).to.have.property('test', true);
                    expect(swaggerSchema).to.eql({
                        required: false,
                        test: true
                    });

                    done();
                });
            });

            describe('#5: array', function () {
                var newModelStub;

                beforeEach(function (done) {
                    newModelStub = sinon.stub(generator, 'newModel');
                    newModelStub.onCall(0).returns({type: 'string'});
                    newModelStub.onCall(1).returns({type: 'test'});
                    done();
                });

                afterEach(function (done) {
                    generator.newModel.restore();
                    done();
                });

                it('Check items', function (done) {
                    var models = {};
                    var primitiveArray = generator.fromJoiSchema(Joi.array().includes(Joi.string()), null, models);
                    expect(primitiveArray).to.exist;
                    expect(primitiveArray).to.eql({required: false, type: 'array', items: {'type': 'string'}});
                    expect(newModelStub.callCount).to.be.eql(1);
                    expect(newModelStub.calledWith(Joi.string(), null, models)).to.be.ok;

                    var modelArray = generator.fromJoiSchema(Joi.array().includes(Joi.object()), null, models);

                    expect(modelArray).to.exist;
                    expect(modelArray).to.eql({required: false, type: 'array', items: {'$ref': 'test'}});
                    expect(newModelStub.calledWith(Joi.object(), null, models)).to.be.ok;

                    models = {};

                    var noInclusionTypes = generator.fromJoiSchema(Joi.array(), null, models);
                    expect(noInclusionTypes).to.be.eql({required: false, type: 'array'});
                    expect(models).to.be.eql({});

                    done();
                });
            });

            it('#6: boolea, date & any ', function (done) {
                var models = {};
                expect(generator.fromJoiSchema(Joi.any(), null, models)).to.eql({required: false, type: 'any'});
                expect(generator.fromJoiSchema(Joi.any().options({swaggerType: 'file'}), null, models)).to.eql({
                    required: false,
                    type: 'file'
                });
                expect(generator.fromJoiSchema(Joi.boolean(), null, models)).to.eql({required: false, type: 'boolean'});
                expect(generator.fromJoiSchema(Joi.date(), null, models)).to.eql({required: false, type: 'date'});
                done();
            });
        });
    });
});