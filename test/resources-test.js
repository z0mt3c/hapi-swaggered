'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()
const describe = lab.experiment
const it = lab.test
const Code = require('code')
const expect = Code.expect
const Joi = require('joi')
const Hoek = require('hoek')
const resources = require('../lib/resources')
const schemas = require('../lib/schema')
const _ = require('lodash')
const defaults = _.pick(require('../lib/defaults'), ['supportedMethods', 'tagging'])
const Hapi = require('hapi')

const baseRoute = {
  method: 'GET',
  path: '/testEndpoint',
  options: {
    tags: ['api', 'test'],
    handler: function (request, reply) {
      reply({})
    }
  }
}

const internals = {
  resources (routes, settings, tags) {
    const server = Hapi.Server({ port: 80 })
    server.route(routes)
    const table = server.table()
    const myResources = resources(_.extend({}, defaults, { tagging: { mode: 'tags' } }, settings), table, tags)
    Joi.assert(myResources.paths, Joi.object({}).pattern(/.*/, schemas.Path))
    Joi.assert(myResources.definitions, Joi.object({}).pattern(/.*/, schemas.Definition))

    return myResources
  }
}

describe('resources', () => {
  it('check setup', () => {
    const resources = internals.resources(baseRoute)
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.exist()
  })

  it('filtering', () => {
    const route1 = Hoek.applyToDefaults(baseRoute, { options: { tags: ['myTestTag'] } })
    const route2 = Hoek.applyToDefaults(baseRoute, { method: 'POST', options: { tags: ['myTestTag', 'requiredTag'] } })
    let resources = internals.resources([route1, route2], {}, 'requiredTag')
    expect(resources.paths['/testEndpoint']).to.only.include('post')
    resources = internals.resources([route1, route2], {}, '-requiredTag')
    expect(resources.paths['/testEndpoint']).to.only.include('get')
    resources = internals.resources([route1, route2], { requiredTags: ['requiredTag'] })
    expect(resources.paths['/testEndpoint']).to.only.include('post')
  })

  it('tags are exposed', () => {
    const resources = internals.resources(Hoek.applyToDefaults(baseRoute, { options: { tags: ['myTestTag'] } }))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.include({ tags: ['myTestTag'] })
  })

  it('notes->description and description->summary are exposed', () => {
    const resources = internals.resources(Hoek.applyToDefaults(baseRoute, { options: { notes: 'my notes', description: 'my description' } }))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.include({ summary: 'my description', description: 'my notes' })
  })

  it('deprecation', () => {
    const tags = ['myTestTag', 'deprecated']
    const resources = internals.resources(Hoek.applyToDefaults(baseRoute, { options: { tags: tags } }))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.include({ tags: tags, deprecated: true })
  })

  it('stripPrefix', () => {
    const resources = internals.resources(Hoek.applyToDefaults(baseRoute, { path: '/api/foo/bar' }), { stripPrefix: '/api' })
    expect(resources).to.exist()
    expect(resources.paths['/api/foo/bar']).to.not.exist()
    expect(resources.paths['/foo/bar']).to.exist()
  })

  it('stripPrefix for ROOT', () => {
    const resources = internals.resources(Hoek.applyToDefaults(baseRoute, { path: '/api' }), { stripPrefix: '/api' })
    expect(resources).to.exist()
    expect(resources.paths['/api']).to.not.exist()
    expect(resources.paths['/']).to.not.exist()
  })

  describe('params', () => {
    it('simple', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        options: {
          plugins: {
            'hapi-swaggered': {
              produces: ['application/pdf']
            }
          },
          validate: { params: Joi.object({ bar: Joi.string().description('test').required() }) }
        }
      }))

      expect(resources.paths['/foo/{bar}'].get.produces).to.equal(['application/pdf'])
      expect(resources.paths['/foo/{bar}'].get.parameters).to.equal([{
        required: true,
        description: 'test',
        type: 'string',
        name: 'bar',
        in: 'path'
      }])
    })
  })

  describe('produces', () => {
    it('#1', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        options: { validate: { params: Joi.object({ bar: Joi.string().description('test').required() }) } }
      }))

      expect(resources.paths['/foo/{bar}'].get).to.include({
        parameters: [{
          required: true,
          description: 'test',
          type: 'string',
          name: 'bar',
          in: 'path'
        }]
      })
    })
  })

  describe('custom params', () => {
    it('allows params that start with x-', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          plugins: {
            'hapi-swaggered': {
              custom: {
                'x-test-foo': 'test value'
              }
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get).to.include({
        'x-test-foo': 'test value'
      })
    })
  })

  describe('responses', () => {
    // TODO: description, test with primary types + arrays
    it('only response model', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          response: {
            schema: Joi.object({
              bar: Joi.string().description('test').required()
            }).description('test'),
            status: {
              500: Joi.object({
                bar: Joi.string().description('test').required()
              }).description('test')
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.include({
        default: { description: 'test', schema: { $ref: '#/definitions/BarModel' } },
        500: { description: 'test', schema: { $ref: '#/definitions/BarModel' } }
      })
    })

    it('array response type', () => {
      const sameModel = Joi.array().items(Joi.string().description('name')).description('test')
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          response: {
            schema: sameModel,
            status: {
              500: sameModel,
              501: Joi.array().description('test1'),
              502: Joi.array().items(Joi.number().integer()).description('num'),
              503: Joi.array().items(Joi.object({ name: Joi.string() }).meta({ className: 'TestModel' })).description('num')
            }
          }
        }
      }))

      expect(resources).to.exist()

      const sameResponse = { description: 'test', schema: { type: 'array', items: { type: 'string' }, description: 'test' } }
      expect(resources.paths['/foo'].get.responses).to.equal({
        default: sameResponse,
        500: sameResponse,
        501: { description: 'test1', schema: { type: 'array', description: 'test1', items: { type: 'string' } } },
        502: { description: 'num', schema: { type: 'array', items: { type: 'integer' }, description: 'num' } },
        503: { description: 'num', schema: { type: 'array', description: 'num', items: { $ref: '#/definitions/TestModel' } } }
      })
    })
    it('primitive response type', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          response: {
            schema: Joi.string().description('test'),
            status: {
              500: Joi.number(),
              501: Joi.number().integer().description('test')
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.equal({
        default: { description: 'test', schema: { type: 'string', description: 'test' } },
        500: { description: '', schema: { type: 'number', description: undefined } },
        501: { description: 'test', schema: { type: 'integer', description: 'test' } }
      })
    })

    it('plugin options without model', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          plugins: {
            'hapi-swaggered': {
              responses: {
                default: { description: 'Bad Request' },
                500: { description: 'Internal Server Error', type: 'string' }
              }
            }
          },
          response: {
            schema: Joi.object({
              bar: Joi.string().required()
            }).description('test')
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.include({
        default: { description: 'test', schema: { $ref: '#/definitions/BarModel' } },
        500: { description: 'Internal Server Error', schema: { type: 'string' } }
      })
    })

    it('plugin options with model', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          plugins: {
            'hapi-swaggered': {
              responses: {
                default: {
                  description: 'Bad Request',
                  schema: Joi.object({
                    bar: Joi.string().description('test').required()
                  })
                },
                500: { description: 'Internal Server Error' }
              }
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.include({
        default: { description: 'Bad Request', schema: { $ref: '#/definitions/BarModel' } },
        500: { description: 'Internal Server Error' }
      })
    })

    it('plugin options with operationId', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          plugins: {
            'hapi-swaggered': {
              operationId: 'fooTest'
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.operationId).to.equal('fooTest')
    })
  })

  describe('header', () => {
    it('simple', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        options: { validate: { headers: Joi.object({ bar: Joi.string().description('test').required() }) } }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo/{bar}'].get).to.include({
        parameters: [{
          required: true,
          description: 'test',
          type: 'string',
          name: 'bar',
          in: 'header'
        }]
      })
    })
  })

  describe('query', () => {
    it('simple', () => {
      const params = {
        bar: Joi.string().description('test').required(),
        foo: Joi.number().integer().min(20).max(30).default(2).required(),
        array: Joi.array().items(Joi.string()),
        arrayOfObjects: Joi.array().items(Joi.object({ bar: Joi.string().description('test').required() })),
        any: Joi.any()
      }

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          validate: {
            query: Joi.object(params)
          }
        }
      }))

      expect(resources).to.exist()
      const parameters = resources.paths['/foo'].get.parameters
      expect(parameters).to.have.length(_.keys(params).length - 1)

      expect(parameters).to.include({
        required: true,
        description: 'test',
        type: 'string',
        name: 'bar',
        in: 'query'
      })

      expect(parameters).to.include({
        required: true,
        default: 2,
        minimum: 20,
        maximum: 30,
        type: 'integer',
        name: 'foo',
        in: 'query'
      })

      expect(parameters).to.include({
        required: false,
        type: 'array',
        items: { type: 'string' },
        name: 'array',
        in: 'query'
      })

      expect(parameters).to.include({
        required: false,
        type: 'array',
        items: { type: 'string' },
        name: 'array',
        in: 'query'
      })
    })

    it('drop any', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        options: {
          validate: {
            query: Joi.object({
              any: Joi.any()
            })
          }
        }
      }))

      expect(resources).to.exist()
      const parameters = resources.paths['/foo'].get.parameters
      expect(parameters).to.not.exist()
    })
  })

  describe('form', () => {
    it('simple', () => {
      _.each(
        ['application/x-www-form-urlencoded', 'multipart/form-data'],
        (mimeType) => {
          const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
            method: 'post',
            path: '/foo/{bar}',
            options: {
              validate: { payload: Joi.object({ bar: Joi.string().description('test').required() }) },
              payload: { allow: [mimeType] }
            }
          }))

          expect(resources).to.exist()
          expect(resources.paths['/foo/{bar}'].post).to.include({
            parameters: [{
              required: true,
              description: 'test',
              type: 'string',
              name: 'bar',
              in: 'formData'
            }]
          })
        }
      )
    })

    it('nested', () => {
      _.each(
        ['application/x-www-form-urlencoded', 'multipart/form-data'],
        (mimeType) => {
          const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
            method: 'post',
            path: '/foo/{bar}',
            options: {
              validate: { payload: Joi.object({ bar: Joi.string().description('test').required(), foo: Joi.object({ bar: Joi.string().description('test').required() }) }) },
              payload: { allow: [mimeType] }
            }
          }))

          expect(resources).to.exist()
          expect(resources.paths['/foo/{bar}'].post).to.include({
            parameters: [{
              required: true,
              description: 'test',
              type: 'string',
              name: 'bar',
              in: 'formData'
            }]
          })
          expect(resources.paths['/foo/{bar}'].post.parameters).to.have.length(1)
        }
      )
    })
  })

  describe('payload', () => {
    it('simple', () => {
      const expectedParam = {
        name: 'TestModel',
        required: true,
        in: 'body',
        description: 'foobar',
        schema: {
          $ref: '#/definitions/TestModel'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        method: 'post',
        options: { validate: { payload: Joi.object({ bar: Joi.string().description('test').required() }).description('foobar').required().meta({ className: 'TestModel' }) } }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].post).to.include({
        parameters: [expectedParam]
      })
      expect(resources.definitions.TestModel).to.exist()
    })

    it('primitive', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        method: 'post',
        options: { validate: { payload: Joi.string().description('string!') } }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].post.parameters).to.equal([
        {
          required: false,
          description: 'string!',
          in: 'body',
          name: 'Payload',
          schema: {
            type: 'string',
            description: 'string!'
          }
        }
      ])
    })

    it('array of primitive', () => {
      const expectedParam = {
        name: 'Test',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Test'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        options: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.string()
            ).description('foobar').required().meta({ className: 'Test' })
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.include({
        parameters: [expectedParam]
      })
      expect(resources.definitions.Test).to.exist()
      expect(resources.definitions.Test).to.include({
        type: 'array',
        description: 'foobar',
        items: { type: 'string' }
      })
    })

    it('array of primitive', () => {
      const expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        options: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.string()
            ).description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.equal({
        type: 'array',
        description: 'foobar',
        items: { type: 'string' }
      })
    })

    it('array of undefined', () => {
      const expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        options: {
          tags: ['api'],
          validate: {
            payload: Joi.array().description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.equal({
        type: 'array',
        description: 'foobar',
        items: { type: 'string' }
      })
    })

    it('array of objects', () => {
      const expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        options: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.object({ name: Joi.string() })
            ).description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.equal({
        type: 'array',
        description: 'foobar',
        items: { $ref: '#/definitions/NameModel' }
      })
    })

    it('function', () => {
      const resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        options: {
          tags: ['api'],
          validate: {
            payload: (value, next) => next(null, value)
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test']).to.exist()
      expect(resources.paths['/foobar/test'].post.parameters).not.to.exist()
    })
  })
})
