'use strict'

const Lab = require('lab')
let lab = exports.lab = Lab.script()

const describe = lab.experiment
const it = lab.test
const Code = require('code')
const expect = Code.expect
const Joi = require('joi')

const Hapi = require('hapi')
const Hoek = require('hoek')
const index = require('../')
const schemas = require('../lib/schema')

const baseRoute = {
  method: 'GET',
  path: '/testEndpoint',
  config: {
    tags: ['api', 'test'],
    handler: function (request, reply) {
      reply({})
    }
  }
}

describe('plugin', () => {
  describe('init', () => {
    it('no options', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index
      }, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('empty options', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})

      server.register({
        register: index,
        options: { responseValidation: true }
      }, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('with route prefix', (done) => {
      const server = new Hapi.Server()
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
      }, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('with route prefix and base path', (done) => {
      const server = new Hapi.Server()
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
      }, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('without response validation', (done) => {
      const server = new Hapi.Server()
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
      }, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('broken info', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})

      const options = {
        register: index,
        options: {
          info: {bull: 'shit'}
        }
      }

      const reply = function () {}
      expect(server.register.bind(server.pack, options, reply)).to.throw()
      done()
    })

    it('valid info', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})

      const options = {
        register: index,
        options: {
          info: {
            title: 'Overwritten',
            description: 'Description',
            version: '1.2.3'
          }
        }
      }

      server.register(options, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })
  })

  describe('settings', () => {
    it('with cache', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: { responseValidation: true }
      }, () => {
        server.route(Hoek.applyToDefaults(baseRoute, {}))
        const call = function (next) {
          server.inject('/swagger', (res) => {
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

        call(() => {
          call(done)
        })
      })
    })

    it('without cache', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          cache: false
        }
      }, () => {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        const call = function (next) {
          server.inject('/swagger', (res) => {
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

        call(() => {
          call(done)
        })
      })
    })

    it('basePath', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          basePath: '/test'
        }
      }, () => {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        const call = function (next) {
          server.inject('/swagger', (res) => {
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

        call(() => {
          call(done)
        })
      })
    })

    it('basePath with stripPrefix', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          stripPrefix: '/testEndpoint',
          basePath: '/test'
        }
      }, () => {
        server.route(Hoek.applyToDefaults(baseRoute, {}))

        const call = function (next) {
          server.inject('/swagger', (res) => {
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

        call(() => {
          call(done)
        })
      })
    })
  })

  describe('/swagger', () => {
    let server

    lab.beforeEach((done) => {
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
          },
          routeConfig: {}
        }
      }, done)
    })

    it('empty', (done) => {
      server.inject('/swagger', (res) => {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)
        Joi.assert(res.result, schemas.Swagger)
        expect(res.result).to.include({swagger: '2.0', paths: {}, definitions: {}})
        done()
      })
    })

    it('simple', (done) => {
      server.route(Hoek.applyToDefaults(baseRoute, {}))
      server.inject('/swagger', (res) => {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)
        Joi.assert(res.result, schemas.Swagger)
        expect(res.result).to.include({
          swagger: '2.0',
          definitions: {},
          paths: {
            '/testEndpoint': {
              get: {
                tags: ['test'],
                responses: { default: { 'description': '' } },
                produces: ['application/json']
              }
            }
          }
        })
        done()
      })
    })

    it('wildcard', (done) => {
      server.route(Hoek.applyToDefaults(baseRoute, { method: '*' }))
      server.inject('/swagger', (res) => {
        expect(res.statusCode).to.exist()
        expect(res.statusCode).to.equal(200)

        const operation = {
          tags: ['test'],
          responses: { default: { 'description': '' } },
          produces: ['application/json']
        }

        expect(res.result).to.include({
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

  describe('tagging', () => {
    it('mode: path (default), pathLevel: 1 (default)', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: { responseValidation: true }
      }, (err) => {
        expect(err).to.not.exist()
        server.route(
          Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' })
        )
        server.inject('/swagger', (res) => {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['foo'])
          done()
        })
      })
    })

    it('mode: path, pathLevel: 2', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'path',
            pathLevel: 2
          }
        }
      }, (err) => {
        expect(err).to.not.exist()
        server.route(
          Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' })
        )
        server.inject('/swagger', (res) => {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['foo/bar'])
          done()
        })
      })
    })

    it('mode: tags, stripRequiredTags: true', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: true
          }
        }
      }, (err) => {
        expect(err).to.not.exist()
        server.route(
          Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' })
        )
        server.inject('/swagger', (res) => {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['test'])
          done()
        })
      })
    })

    it('mode: tags, stripRequiredTags: false', (done) => {
      const server = new Hapi.Server()
      server.connection({port: 80})
      server.register({
        register: index,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: false
          }
        }
      }, (err) => {
        expect(err).to.not.exist()
        server.route(
          Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' })
        )
        server.inject('/swagger', (res) => {
          expect(res.statusCode).to.equal(200)
          expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['api', 'test'])
          done()
        })
      })
    })

    it(
      'mode: tags, stripRequiredTags: false, stripAdditionalTags: [test]',
      (done) => {
        const server = new Hapi.Server()
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
        }, (err) => {
          expect(err).to.not.exist()
          server.route(
            Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' })
          )
          server.inject('/swagger', (res) => {
            expect(res.statusCode).to.equal(200)
            expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['api'])
            done()
          })
        })
      }
    )
  })
})
