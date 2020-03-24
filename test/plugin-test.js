'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()

const describe = lab.experiment
const it = lab.test
const Code = require('code')
const expect = Code.expect
const Joi = require('joi')

const Hapi = require('hapi')
const Hoek = require('hoek')
const plugin = require('../')
const schemas = require('../lib/schema')

const baseRoute = {
  method: 'GET',
  path: '/testEndpoint',
  options: {
    tags: ['api', 'test'],
    handler () {
      return {}
    }
  }
}

describe('plugin', () => {
  describe('init', () => {
    it('no options', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = { plugin }

      await expect(server.register(options)).not.to.reject()
    })

    it('empty options', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: { responseValidation: true }
      }

      await expect(server.register(options)).not.to.reject()
    })

    it('with route prefix', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: {
          stripPrefix: '/api'
        },
        routes: {
          prefix: '/api/test123'
        }
      }

      await expect(server.register(options)).not.to.reject()
    })

    it('with route prefix and base path', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: {
          stripPrefix: '/api',
          basePath: '/test'
        },
        routes: {
          prefix: '/api/test123'
        }
      }

      await expect(server.register(options)).not.to.reject()
    })

    it('without response validation', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: {
          responseValidation: false
        },
        routes: {
          prefix: '/api/test123'
        }
      }

      await expect(server.register(options)).not.to.reject()
    })

    it('broken info', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: {
          info: { bull: 'shit' }
        }
      }

      await expect(server.register(options)).to.reject()
    })

    it('valid info', async () => {
      const server = Hapi.Server({ port: 80 })
      const options = {
        plugin,
        options: {
          info: {
            title: 'Overwritten',
            description: 'Description',
            version: '1.2.3'
          }
        }
      }

      await expect(server.register(options)).not.to.reject()
    })
  })

  describe('settings', () => {
    it('with cache', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: { responseValidation: true }
      })

      server.route(Hoek.applyToDefaults(baseRoute, {}))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)
      Joi.assert(res.result, schemas.Swagger)
      expect(res.result).to.exist()
      expect(res.result.paths).to.exist()
      expect(res.result.paths['/testEndpoint']).to.exist()
      expect(res.result.paths['/testEndpoint'].get).to.exist()
    })

    it('without cache', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          cache: false
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, {}))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)
      Joi.assert(res.result, schemas.Swagger)
      expect(res.result).to.exist()
      expect(res.result.paths).to.exist()
      expect(res.result.paths['/testEndpoint']).to.exist()
      expect(res.result.paths['/testEndpoint'].get).to.exist()
    })

    it('basePath', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          basePath: '/test'
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, {}))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)
      Joi.assert(res.result, schemas.Swagger)
      expect(res.result).to.exist()
      expect(res.result.paths).to.exist()
      expect(res.result.basePath).to.exist()
      expect(res.result.basePath).to.equal('/test')
    })

    it('basePath with stripPrefix', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          stripPrefix: '/testEndpoint',
          basePath: '/test'
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, {}))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)
      Joi.assert(res.result, schemas.Swagger)
      expect(res.result).to.exist()
      expect(res.result.paths).to.exist()
      expect(res.result.basePath).to.exist()
      expect(res.result.basePath).to.equal('/test/testEndpoint')
    })
  })

  describe('/swagger', () => {
    let server

    lab.beforeEach(async () => {
      server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          cache: false,
          tagging: {
            mode: 'tags'
          },
          tags: {
            serverDescription: 'myDesc2'
          },
          routeConfig: {}
        }
      })
    })

    it('empty', async () => {
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)
      Joi.assert(res.result, schemas.Swagger)
      expect(res.result).to.include({ swagger: '2.0', paths: {}, definitions: {} })
    })

    it('simple', async () => {
      server.route(Hoek.applyToDefaults(baseRoute, {}))
      const res = await server.inject('/swagger')

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
              responses: { default: { description: '' } },
              produces: ['application/json']
            }
          }
        }
      })
    })

    it('wildcard', async () => {
      server.route(Hoek.applyToDefaults(baseRoute, { method: '*' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.exist()
      expect(res.statusCode).to.equal(200)

      const operation = {
        tags: ['test'],
        responses: { default: { description: '' } },
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
    })
  })

  describe('tagging', () => {
    it('mode: path (default), pathLevel: 1 (default)', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: { responseValidation: true }
      })

      server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.equal(200)
      expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['foo'])
    })

    it('mode: path, pathLevel: 2', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          tagging: {
            mode: 'path',
            pathLevel: 2
          }
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.equal(200)
      expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['foo/bar'])
    })

    it('mode: tags, stripRequiredTags: true', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: true
          }
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.equal(200)
      expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['test'])
    })

    it('mode: tags, stripRequiredTags: false', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: false
          }
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.equal(200)
      expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['api', 'test'])
    })

    it('mode: tags, stripRequiredTags: false, stripAdditionalTags: [test]', async () => {
      const server = Hapi.Server({ port: 80 })

      await server.register({
        plugin,
        options: {
          tagging: {
            mode: 'tags',
            stripRequiredTags: false,
            stripAdditionalTags: ['test']
          }
        }
      })

      server.route(Hoek.applyToDefaults(baseRoute, { method: 'get', path: '/foo/bar/test/it' }))
      const res = await server.inject('/swagger')

      expect(res.statusCode).to.equal(200)
      expect(res.result.paths['/foo/bar/test/it'].get.tags).to.equal(['api'])
    })
  })
})
