var Lab = require('lab')
var lab = exports.lab = Lab.script()

var describe = lab.experiment
var it = lab.test
var Code = require('code')
var expect = Code.expect
var Joi = require('joi')

var Hapi = require('hapi')
var Hoek = require('hoek')
var index = require('../')
var schemas = require('../lib/schema')

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

describe('plugin', function () {
  describe('init', function () {
    it('no options', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index
      }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('empty options', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index,
        options: { responseValidation: true }
      }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('with route prefix', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index,
        options: {
          stripPrefix: '/api'
        }
      }, {
        routes: {
          prefix: '/api/test123'
        }
      }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('with route prefix and base path', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index,
        options: {
          stripPrefix: '/api',
          basePath: '/test'
        }
      }, {
        routes: {
          prefix: '/api/test123'
        }
      }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('without response validation', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index,
        options: {
          responseValidation: false
        }
      }, {
        routes: {
          prefix: '/api/test123'
        }
      }, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })

    it('broken info', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      var options = {
        register: index,
        options: {
          info: {bull: 'shit'}
        }
      }

      var reply = function () {}
      expect(server.register.bind(server.pack, options, reply)).to.throw()
      done()
    })

    it('valid info', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})

      var options = {
        register: index,
        options: {
          info: {
            title: 'Overwritten',
            description: 'Description',
            version: '1.2.3'
          }
        }
      }

      server.register(options, function (err) {
        expect(err).to.not.exist()
        done()
      })
    })
  })

  describe('settings', function () {
    it('with cache', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: { responseValidation: true }
      }, function () {
        server.route(Hoek.applyToDefaults(baseRoute, {}))
        var call = function (next) {
          server.inject('/swagger', function (res) {
            expect(res.statusCode).to.exist()
            expect(res.statusCode).to.equal(200)
            Joi.assert(res.result, schemas.Swagger)
            expect(res.result).to.exist()
            expect(res.result.paths).to.exist()
            expect(res.result.paths['/testEndpoint']).to.exist()
            expect(res.result.paths['/testEndpoint'].get).to.exist()
            next()
          })
        }

        call(function () {
          call(done)
        })
      })
    })

    it('without cache', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          cache: false
        }
      }, function () {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        var call = function (next) {
          server.inject('/swagger', function (res) {
            expect(res.statusCode).to.exist()
            expect(res.statusCode).to.equal(200)
            Joi.assert(res.result, schemas.Swagger)
            expect(res.result).to.exist()
            expect(res.result.paths).to.exist()
            expect(res.result.paths['/testEndpoint']).to.exist()
            expect(res.result.paths['/testEndpoint'].get).to.exist()
            next()
          })
        }

        call(function () {
          call(done)
        })
      })
    })

    it('basePath', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          basePath: '/test'
        }
      }, function () {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        var call = function (next) {
          server.inject('/swagger', function (res) {
            expect(res.statusCode).to.exist()
            expect(res.statusCode).to.equal(200)
            Joi.assert(res.result, schemas.Swagger)
            expect(res.result).to.exist()
            expect(res.result.paths).to.exist()
            expect(res.result.basePath).to.exist()
            expect(res.result.basePath).to.equal('/test')
            next()
          })
        }

        call(function () {
          call(done)
        })
      })
    })

    it('basePath with stripPrefix', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          stripPrefix: '/testEndpoint',
          basePath: '/test'
        }
      }, function () {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        var call = function (next) {
          server.inject('/swagger', function (res) {
            expect(res.statusCode).to.exist()
            expect(res.statusCode).to.equal(200)
            Joi.assert(res.result, schemas.Swagger)
            expect(res.result).to.exist()
            expect(res.result.paths).to.exist()
            expect(res.result.basePath).to.exist()
            expect(res.result.basePath).to.equal('/test/testEndpoint')
            next()
          })
        }

        call(function () {
          call(done)
        })
      })
    })
  })

  describe('/swagger', function () {
    var server

    lab.beforeEach(function (done) {
      server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          cache: false,
          tagging: {
            mode: 'tags'
          },
          tags: {
            'serverDescription': 'myDesc2'
          }
        }
      }, done)
    })

    it('empty', function (done) {
      server.inject('/swagger', function (res) {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)
        Joi.assert(res.result, schemas.Swagger)
        expect(res.result).to.deep.include({swagger: '2.0', paths: {}, definitions: {}})
        done()
      })
    })

    it('simple', function (done) {
      server.route(Hoek.applyToDefaults(baseRoute, {}))
      server.inject('/swagger', function (res) {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)
        Joi.assert(res.result, schemas.Swagger)
        expect(res.result).to.deep.include({
          swagger: '2.0',
          definitions: {},
          paths: {
            '/testEndpoint': {
              get: {
                tags: ['test'],
                responses: { default: {} },
                produces: ['application/json']
              }
            }
          }
        })
        done()
      })
    })

    it('wildcard', function (done) {
      server.route(Hoek.applyToDefaults(baseRoute, { method: '*' }))
      server.inject('/swagger', function (res) {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)

        var operation = {
          tags: ['test'],
          responses: { default: {} },
          produces: ['application/json']
        }

        expect(res.result).to.deep.include({
          swagger: '2.0',
          definitions: {},
          paths: {
            '/testEndpoint': {
              get: operation,
              put: operation,
              post: operation,
              delete: operation,
              patch: operation
            }
          }
        })

        Joi.assert(res.result, schemas.Swagger)
        done()
      })
    })
  })

  describe('tagging', function () {
    it('mode: path (default), pathLevel: 1 (default)', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: { responseValidation: true }
      }, function (err) {
        expect(err).to.not.exist()
        server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
        server.inject('/swagger', function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.deep.equal(['foo'])
          done()
        })
      })
    })

    it('mode: path, pathLevel: 2', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'path',
            pathLevel: 2
          }
        }
      }, function (err) {
        expect(err).to.not.exist()
        server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
        server.inject('/swagger', function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.deep.equal(['foo/bar'])
          done()
        })
      })
    })

    it('mode: tags, stripRequiredTags: true', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: true
          }
        }
      }, function (err) {
        expect(err).to.not.exist()
        server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
        server.inject('/swagger', function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.deep.equal(['test'])
          done()
        })
      })
    })

    it('mode: tags, stripRequiredTags: false', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: false
          }
        }
      }, function (err) {
        expect(err).to.not.exist()
        server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
        server.inject('/swagger', function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.deep.equal(['api', 'test'])
          done()
        })
      })
    })

    it('mode: tags, stripRequiredTags: false, stripAdditionalTags: [test]', function (done) {
      var server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: false,
            stripAdditionalTags: ['test']
          }
        }
      }, function (err) {
        expect(err).to.not.exist()
        server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
        server.inject('/swagger', function (res) {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.deep.equal(['api'])
          done()
        })
      })
    })
  })
})
