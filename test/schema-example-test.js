'use strict'

const Lab = require('lab')
let lab = exports.lab = Lab.script()
const describe = lab.experiment
const it = lab.test
const Joi = require('joi')
const schema = require('../lib/schema')

describe('Schema examples', () => {
  it('microurl', (done) => {
    Joi.assert(require('./specs-v2.0-examples/spec.json'), schema.Swagger)
    done()
  })

  it('petstore-simple', (done) => {
    Joi.assert(require('./specs-v2.0-examples/petstore-simple.json'), schema.Swagger)
    done()
  })

  it('petstore-expanded', (done) => {
    Joi.assert(require('./specs-v2.0-examples/petstore-expanded.json'), schema.Swagger)
    done()
  })

  it('petstore', (done) => {
    Joi.assert(require('./specs-v2.0-examples/petstore.json'), schema.Swagger)
    done()
  })
})
