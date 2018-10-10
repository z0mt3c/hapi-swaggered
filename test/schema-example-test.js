'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.experiment
const it = lab.test
const Joi = require('joi')
const schema = require('../lib/schema')

describe('Schema examples', () => {
  it('microurl', () => {
    Joi.assert(require('./specs-v2.0-examples/spec.json'), schema.Swagger)
  })

  it('petstore-simple', () => {
    Joi.assert(require('./specs-v2.0-examples/petstore-simple.json'), schema.Swagger)
  })

  it('petstore-expanded', () => {
    Joi.assert(require('./specs-v2.0-examples/petstore-expanded.json'), schema.Swagger)
  })

  it('petstore', () => {
    Joi.assert(require('./specs-v2.0-examples/petstore.json'), schema.Swagger)
  })
})
