var Lab = require('lab');

var describe = Lab.experiment;
var it = Lab.test;
var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var Joi = require('joi');

var schema = require('../lib/schema');
var generator = require('../lib/generator');

describe('generator', function () {
    it('simple model', function (done) {
        var schema = Joi.object().keys({
            name: Joi.string().description('test').required(),
            number: Joi.number().description('numberDescription').required(),
            integer: Joi.number().min(1).max(3).integer().description('numberDescription').required()
        }).required().options({
            className: 'SwaggerModel'
        });

        var models = {};
        Lab.expect(generator.fromJoiSchema(schema, null, models)).to.eql({
            required: true,
            description: undefined,
            type: 'SwaggerModel'
        });

        Lab.expect(models['SwaggerModel']).to.eql({ id: 'SwaggerModel',
            type: 'object',
            properties: {
                name: {
                    required: true,
                    description: 'test',
                    type: 'string',
                    enum: undefined,
                    defaultValue: undefined
                },
                number: {
                    required: true,
                    description: 'numberDescription',
                    type: 'number',
                    minimum: undefined,
                    maximum: undefined
                },
                integer: {
                    required: true,
                    description: 'numberDescription',
                    type: 'integer',
                    minimum: 1,
                    maximum: 3
                }
            }
        });

        done();
    });
});