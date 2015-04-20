var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.experiment
var it = lab.test
var Joi = require('joi')
var schema = require('../lib/schema')

describe('Schema examples', function () {
  it('microurl', function (done) {
    Joi.assert(require('./specs-v2.0-examples/spec.json'), schema.Swagger)
    done()
  })

  it('petstore-simple', function (done) {
    Joi.assert(require('./specs-v2.0-examples/petstore-simple.json'), schema.Swagger)
    done()
  })

  it('petstore-expanded', function (done) {
    Joi.assert(require('./specs-v2.0-examples/petstore-expanded.json'), schema.Swagger)
    done()
  })

  it('petstore', function (done) {
    Joi.assert(require('./specs-v2.0-examples/petstore.json'), schema.Swagger)
    done()
  })
})
