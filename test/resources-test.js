var Lab = require('lab')
var lab = exports.lab = Lab.script()
var describe = lab.experiment
var it = lab.test
var Code = require('code')
var expect = Code.expect
var Joi = require('joi')
var Hoek = require('hoek')
var resources = require('../lib/resources')
var schemas = require('../lib/schema')
var _ = require('lodash')
var defaults = _.pick(require('../lib/defaults'), ['supportedMethods', 'tagging'])
var Hapi = require('hapi')

var baseRoute = {
  method: 'GET',
  path: '/testEndpoint',
  config: {
    tags: ['api', 'test'],
    handler: function (request, reply) {
      reply({})
    }
  }
}

var internals = {
  resources: function (routes, settings, tags) {
    var server = new Hapi.Server()
    server.connection({port: 80})
    server.route(routes)
    var table = server.connections[0].table()
    var myResources = resources(_.extend({}, defaults, {tagging: {mode: 'tags'}}, settings), table, tags)
    Joi.assert(myResources.paths, Joi.object({}).pattern(/./g, schemas.Path))
    Joi.assert(myResources.definitions, Joi.object({}).pattern(/./g, schemas.Definition))
    return myResources
  }
}

describe('resources', function () {
  it('check setup', function (done) {
    var resources = internals.resources(baseRoute)
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.exist()
    done()
  })

  it('filtering', function (done) {
    var route1 = Hoek.applyToDefaults(baseRoute, {config: {tags: ['myTestTag']}})
    var route2 = Hoek.applyToDefaults(baseRoute, {method: 'POST', config: {tags: ['myTestTag', 'requiredTag']}})
    var resources = internals.resources([route1, route2], {}, 'requiredTag')
    expect(resources.paths['/testEndpoint']).to.only.include('post')
    resources = internals.resources([route1, route2], {}, '-requiredTag')
    expect(resources.paths['/testEndpoint']).to.only.include('get')
    resources = internals.resources([route1, route2], {requiredTags: ['requiredTag']})
    expect(resources.paths['/testEndpoint']).to.only.include('post')
    done()
  })

  it('tags are exposed', function (done) {
    var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {tags: ['myTestTag']}}))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: ['myTestTag']})
    done()
  })

  it('notes->description and description->summary are exposed', function (done) {
    var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {notes: 'my notes', description: 'my description'}}))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.deep.include({summary: 'my description', description: 'my notes'})
    done()
  })

  it('deprecation', function (done) {
    var tags = ['myTestTag', 'deprecated']
    var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {config: {tags: tags}}))
    expect(resources).to.exist()
    expect(resources.paths['/testEndpoint'].get).to.deep.include({tags: tags, deprecated: true})
    done()
  })

  it('stripPrefix', function (done) {
    var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {path: '/api/foo/bar'}), {stripPrefix: '/api'})
    expect(resources).to.exist()
    expect(resources.paths['/api/foo/bar']).to.not.exist()
    expect(resources.paths['/foo/bar']).to.exist()
    done()
  })

  it('stripPrefix for ROOT', function (done) {
    var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {path: '/api'}), {stripPrefix: '/api'})
    expect(resources).to.exist()
    expect(resources.paths['/api']).to.not.exist()
    expect(resources.paths['/']).to.not.exist()
    done()
  })

  describe('params', function () {
    it('simple', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        config: {
          plugins: {
            'hapi-swaggered': {
              produces: ['application/pdf']
            }
          },
          validate: {params: Joi.object({bar: Joi.string().description('test').required()})}}
      }))

      expect(resources.paths['/foo/{bar}'].get.produces).to.deep.equal(['application/pdf'])
      expect(resources.paths['/foo/{bar}'].get.parameters).to.deep.equal([{
        required: true,
        description: 'test',
        type: 'string',
        name: 'bar',
        in: 'path'
      }])

      done()
    })
  })

  describe('produces', function () {
    it('#1', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        config: {validate: {params: Joi.object({bar: Joi.string().description('test').required()})}}
      }))

      expect(resources.paths['/foo/{bar}'].get).to.deep.include({
        parameters: [{
          required: true,
          description: 'test',
          type: 'string',
          name: 'bar',
          in: 'path'
        }]
      })

      done()
    })
  })

  describe('custom params', function () {
    it('allows params that start with x-', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
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

      done()
    })
  })

  describe('responses', function () {
    // TODO: description, test with primary types + arrays
    it('only response model', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          response: {
            schema: Joi.object({
              bar: Joi.string().description('test').required()
            }).description('test'),
            status: {
              500: Joi.object({
                bar: Joi.string().description('test').required()
              })
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.deep.include({
        default: {description: 'test', schema: {$ref: '#/definitions/BarModel'}},
        500: {description: '', schema: {$ref: '#/definitions/BarModel'}}
      })
      done()
    })

    it('array response type', function (done) {
      var sameModel = Joi.array().items(Joi.string().description('name')).description('test')
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          response: {
            schema: sameModel,
            status: {
              500: sameModel,
              501: Joi.array().description('test1'),
              502: Joi.array().items(Joi.number().integer()).description('num'),
              503: Joi.array().items(Joi.object({ name: Joi.string() }).meta({className: 'TestModel'})).description('num')
            }
          }
        }
      }))

      expect(resources).to.exist()

      var sameResponse = {description: 'test', schema: {type: 'array', items: {type: 'string'}, description: 'test'}}
      expect(resources.paths['/foo'].get.responses).to.deep.equal({
        default: sameResponse,
        500: sameResponse,
        501: {description: 'test1', schema: {type: 'array', description: 'test1', items: { type: 'string' }}},
        502: {description: 'num', schema: {type: 'array', items: {type: 'integer'}, description: 'num'}},
        503: {description: 'num', schema: {type: 'array', description: 'num', 'items': { $ref: '#/definitions/TestModel' }}}
      })

      done()
    })
    it('primitive response type', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
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
      expect(resources.paths['/foo'].get.responses).to.deep.equal({
        default: {description: 'test', schema: {type: 'string', description: 'test'}},
        500: {description: '', schema: {type: 'number', description: undefined}},
        501: {description: 'test', schema: {type: 'integer', description: 'test'}}
      })

      done()
    })

    it('plugin options without model', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          plugins: {
            'hapi-swaggered': {
              responses: {
                default: {description: 'Bad Request'},
                500: {description: 'Internal Server Error', type: 'string'}
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
      expect(resources.paths['/foo'].get.responses).to.deep.include({
        default: {description: 'test', schema: {$ref: '#/definitions/BarModel'}},
        500: {description: 'Internal Server Error', schema: { type: 'string' }}
      })

      done()
    })

    it('plugin options with model', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          plugins: {
            'hapi-swaggered': {
              responses: {
                default: {
                  description: 'Bad Request', schema: Joi.object({
                    bar: Joi.string().description('test').required()
                  })
                },
                500: {description: 'Internal Server Error'}
              }
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.responses).to.deep.include({
        default: {description: 'Bad Request', schema: {$ref: '#/definitions/BarModel'}},
        500: {description: 'Internal Server Error'}
      })

      done()
    })

    it('plugin options with operationId', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          plugins: {
            'hapi-swaggered': {
              operationId: 'fooTest'
            }
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].get.operationId).to.equal('fooTest')

      done()
    })
  })

  describe('header', function () {
    it('simple', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo/{bar}',
        config: {validate: {headers: Joi.object({bar: Joi.string().description('test').required()})}}
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo/{bar}'].get).to.deep.include({
        parameters: [{
          required: true,
          description: 'test',
          type: 'string',
          name: 'bar',
          in: 'header'
        }]
      })

      done()
    })
  })

  describe('query', function () {
    it('simple', function (done) {
      var params = {
        bar: Joi.string().description('test').required(),
        foo: Joi.number().integer().min(20).max(30).default(2).required(),
        array: Joi.array().items(Joi.string()),
        arrayOfObjects: Joi.array().items(Joi.object({bar: Joi.string().description('test').required()})),
        any: Joi.any()
      }

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          validate: {
            query: Joi.object(params)
          }
        }
      }))

      expect(resources).to.exist()
      var parameters = resources.paths['/foo'].get.parameters
      expect(parameters).to.have.length(_.keys(params).length - 1)

      expect(parameters).to.deep.include({
        required: true,
        description: 'test',
        type: 'string',
        name: 'bar',
        in: 'query'
      })

      expect(parameters).to.deep.include({
        required: true,
        default: 2,
        minimum: 20,
        maximum: 30,
        type: 'integer',
        name: 'foo',
        in: 'query'
      })

      expect(parameters).to.deep.include({
        required: false,
        type: 'array',
        items: {type: 'string'},
        name: 'array',
        in: 'query'
      })

      expect(parameters).to.deep.include({
        required: false,
        type: 'array',
        items: {type: 'string'},
        name: 'array',
        in: 'query'
      })

      done()
    })

    it('drop any', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        config: {
          validate: {
            query: Joi.object({
              any: Joi.any()
            })
          }
        }
      }))

      expect(resources).to.exist()
      var parameters = resources.paths['/foo'].get.parameters
      expect(parameters).to.not.exist()
      done()
    })
  })

  describe('form', function () {
    it('simple', function (done) {
      _.each(['application/x-www-form-urlencoded', 'multipart/form-data'], function (mimeType) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
          method: 'post',
          path: '/foo/{bar}',
          config: {
            validate: {payload: Joi.object({bar: Joi.string().description('test').required()})},
            payload: {allow: [mimeType]}
          }
        }))

        expect(resources).to.exist()
        expect(resources.paths['/foo/{bar}'].post).to.deep.include({
          parameters: [{
            required: true,
            description: 'test',
            type: 'string',
            name: 'bar',
            in: 'formData'
          }]
        })
      })

      done()
    })

    it('nested', function (done) {
      _.each(['application/x-www-form-urlencoded', 'multipart/form-data'], function (mimeType) {
        var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
          method: 'post',
          path: '/foo/{bar}',
          config: {
            validate: {payload: Joi.object({bar: Joi.string().description('test').required(), foo: Joi.object({ bar: Joi.string().description('test').required() })})},
            payload: {allow: [mimeType]}
          }
        }))

        expect(resources).to.exist()
        expect(resources.paths['/foo/{bar}'].post).to.deep.include({
          parameters: [{
            required: true,
            description: 'test',
            type: 'string',
            name: 'bar',
            in: 'formData'
          }]
        })
        expect(resources.paths['/foo/{bar}'].post.parameters).to.have.length(1)
      })

      done()
    })
  })

  describe('payload', function () {
    it('simple', function (done) {
      var expectedParam = {
        name: 'TestModel',
        required: true,
        in: 'body',
        description: 'foobar',
        schema: {
          $ref: '#/definitions/TestModel'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        method: 'post',
        config: {validate: {payload: Joi.object({bar: Joi.string().description('test').required()}).description('foobar').required().meta({className: 'TestModel'})}}
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].post).to.deep.include({
        parameters: [expectedParam]
      })
      expect(resources.definitions.TestModel).to.exist()

      done()
    })

    it('primitive', function (done) {
      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foo',
        method: 'post',
        config: {validate: {payload: Joi.string().description('string!')}}
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foo'].post.parameters).to.deep.equal([
        {
          'required': false,
          'description': 'string!',
          'in': 'body',
          'name': 'Payload',
          'schema': {
            'type': 'string',
            'description': 'string!'
          }
        }
      ])

      done()
    })

    it('array of primitive', function (done) {
      var expectedParam = {
        name: 'Test',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Test'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        config: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.string()
            ).description('foobar').required().meta({className: 'Test'})
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.deep.include({
        parameters: [expectedParam]
      })
      expect(resources.definitions.Test).to.exist()
      expect(resources.definitions.Test).to.deep.include({
        type: 'array',
        description: 'foobar',
        items: {type: 'string'}
      })

      done()
    })

    it('array of primitive', function (done) {
      var expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        config: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.string()
            ).description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.deep.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.deep.equal({
        type: 'array',
        description: 'foobar',
        items: {type: 'string'}
      })

      done()
    })

    it('array of undefined', function (done) {
      var expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        config: {
          tags: ['api'],
          validate: {
            payload: Joi.array().description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.deep.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.deep.equal({
        type: 'array',
        description: 'foobar',
        items: {type: 'string'}
      })

      done()
    })

    it('array of objects', function (done) {
      var expectedParam = {
        name: 'Array',
        in: 'body',
        required: true,
        description: 'foobar',
        schema: {
          $ref: '#/definitions/Array'
        }
      }

      Joi.assert(expectedParam, schemas.Parameter, 'Expected parameter should be valid')

      var resources = internals.resources(Hoek.applyToDefaults(baseRoute, {
        path: '/foobar/test',
        method: 'post',
        config: {
          tags: ['api'],
          validate: {
            payload: Joi.array().items(
              Joi.object({name: Joi.string()})
            ).description('foobar').required()
          }
        }
      }))

      expect(resources).to.exist()
      expect(resources.paths['/foobar/test'].post).to.deep.include({
        parameters: [expectedParam]
      })

      expect(resources.definitions.Array).to.exist()
      expect(resources.definitions.Array).to.deep.equal({
        type: 'array',
        description: 'foobar',
        items: {$ref: '#/definitions/NameModel'}
      })

      done()
    })
  })
})
