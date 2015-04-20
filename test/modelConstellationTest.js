var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var describe = lab.describe
var it = lab.it
var expect = Code.expect
var Joi = require('joi')

var schemas = require('../lib/schema')
var generator = require('../lib/generator')

describe('model constellations', function () {
  it('Just an example', function (done) {
    var schema = Joi.object().keys({
      name: Joi.string().description('test').required(),
      number: Joi.number().description('numberDescription').required(),
      integer: Joi.number().min(1).max(3).integer().description('numberDescription').required()
    }).required().meta({
      className: 'SwaggerModel'
    })

    var models = {}

    expect(generator.fromJoiSchema(schema, null, models)).to.deep.include({
      required: true,
      type: 'SwaggerModel'
    })

    expect(models.SwaggerModel).to.deep.include({
      id: 'SwaggerModel',
      type: 'object',
      properties: {
        name: {
          required: true,
          description: 'test',
          type: 'string'
        },
        number: {
          required: true,
          description: 'numberDescription',
          type: 'number'
        },
        integer: {
          required: true,
          description: 'numberDescription',
          type: 'integer',
          minimum: 1,
          maximum: 3
        }
      }
    })

    Joi.validate(models, schemas.Models, function (err) {
      expect(err).not.to.exist
      done()
    })
  })
})
