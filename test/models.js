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

        var asserts = generator.fromJoiSchema(schema);
        console.log(asserts);
        Lab.expect(asserts).to.equal({
            id: 'SwaggerModel',
            type: 'object',
            required: true,
            properties: {
                name: {
                    type: 'string',
                    description: 'test',
                    required: true
                }
            }
        });

        done();
    });
});