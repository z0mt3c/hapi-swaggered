'use strict'

const Lab = require('lab')
let lab = exports.lab = Lab.script()

const describe = lab.experiment
const it = lab.test
const Code = require('code')
const expect = Code.expect
const Joi = require('joi')
const utils = require('../lib/utils')
const _ = require('lodash')
const schema = require('../lib/schema')

describe('utils', () => {
  describe('getRequestConnection', () => {
    it('#1', (done) => {
      expect(utils.getRequestConnection({connection: 'a', server: 'b'})).to.equal('a')
      expect(utils.getRequestConnection({server: 'b'})).to.equal('b')
      expect(utils.getRequestConnection({})).to.not.exist()
      done()
    })
  })

  describe('getRouteModifiers', () => {
    it('#1', (done) => {
      expect(utils.getRoutesModifiers({config: 'test'})).to.equal('test')
      expect(utils.getRoutesModifiers({realm: {modifiers: 'test'}})).to.equal('test')
      expect(utils.getRoutesModifiers({})).to.not.exist()
      done()
    })
  })

  describe('firstCharToUpperCase', () => {
    it('#1', (done) => {
      Code.expect(utils.firstCharToUpperCase(null)).to.equal(null)
      Code.expect(utils.firstCharToUpperCase('')).to.equal('')
      Code.expect(utils.firstCharToUpperCase('a')).to.equal('A')
      Code.expect(utils.firstCharToUpperCase('joi')).to.equal('Joi')
      done()
    })
  })

  describe('sanitizePath', () => {
    it('#1', (done) => {
      Code.expect(utils.sanitizePath('/')).to.equal('/')
      Code.expect(utils.sanitizePath('/test')).to.equal('/test')
      Code.expect(utils.sanitizePath('/test/{a}')).to.equal('/test/{a}')
      Code.expect(utils.sanitizePath('/test/{a}/{b}')).to.equal('/test/{a}/{b}')
      Code.expect(utils.sanitizePath('/test/{a*}/{b*2}/{c*1}/{d?}')).to.equal('/test/{a}/{b}/{c}/{d}')
      done()
    })
  })

  describe('getCurrentSettings', () => {
    it('#1', (done) => {
      const settings = {
        source: 'plugin',
        settings: {
          plugin: true
        }
      }
      const serverSettings = {
        source: 'server',
        settings: {
          server: true
        }
      }
      Code.expect(utils.getCurrentSettings(null)).to.equal(null)
      Code.expect(utils.getCurrentSettings(settings)).to.equal(settings)
      Code.expect(utils.getCurrentSettings(settings, serverSettings)).to.equal({
        source: 'server',
        settings: {
          plugin: true,
          server: true
        },
        tags: []
      })
      done()
    })
    it('#2: tags', (done) => {
      Code.expect(utils.getCurrentSettings({}, {})).to.equal({
        tags: []
      })

      Code.expect(utils.getCurrentSettings(
        {tags: [{ name: '1', description: '2' }]},
        {tags: [{ name: '2', description: '2' }]})).to.equal({tags: [{ name: '1', description: '2' }, { name: '2', description: '2' }]})

      Code.expect(utils.getCurrentSettings(
        {tags: { '1': '2' }},
        {tags: { '2': '2' }})).to.equal({tags: [{ name: '1', description: '2' }, { name: '2', description: '2' }]})

      done()
    })
  })

  describe('stripRoutesPrefix', () => {
    it('#1', (done) => {
      Code.expect(utils.stripRoutesPrefix(null)).to.be.null()
      Code.expect(utils.stripRoutesPrefix([])).to.have.length(0)
      Code.expect(utils.stripRoutesPrefix([{
        path: '/api/test'
      }], '/api')).to.have.length(1)
      Code.expect(utils.stripRoutesPrefix([{
        path: '/api/test'
      }], '/test')).to.have.length(0)
      // empty route path will be stripped - correct?
      Code.expect(utils.stripRoutesPrefix([{
        path: '/api'
      }], '/api')).to.have.length(0)
      done()
    })
  })

  describe('generateNameFromSchema', () => {
    it('#1', (done) => {
      Code.expect(utils.generateNameFromSchema({
        _inner: {
          children: [{
            key: 'test'
          }, {
            key: 'test2'
          }]
        }
      })).to.equal('TestTest2Model')

      Code.expect(utils.generateNameFromSchema({
        _inner: {
          children: [{
            key: 'test'
          }]
        }
      })).to.equal('TestModel')

      Code.expect(utils.generateNameFromSchema({})).to.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(null)).to.equal('EmptyModel')

      done()
    })

    it('#2 Integration', (done) => {
      const schema = Joi.object().keys({
        name: Joi.string(),
        email: Joi.string()
      })

      Code.expect(utils.generateNameFromSchema(schema)).to.equal('NameEmailModel')
      Code.expect(utils.generateNameFromSchema(Joi.object().keys({}))).to.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(Joi.object())).to.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(Joi.array())).to.equal('Array')
      Code.expect(utils.generateNameFromSchema(Joi.array().items(Joi.string()))).to.equal('Array')

      done()
    })

    it('#3 Primitives', (done) => {
      Code.expect(utils.generateNameFromSchema(Joi.string())).to.equal('String')
      Code.expect(utils.generateNameFromSchema(Joi.number())).to.equal('Number')
      Code.expect(utils.generateNameFromSchema(Joi.number().integer())).to.equal('Integer')
      done()
    })
  })

  describe('generateNameWithFallback', () => {
    it('#1', (done) => {
      const schema = Joi.object().keys({name: Joi.string()})
      Code.expect(utils.generateNameWithFallback(schema)).to.equal('NameModel')
      done()
    })
  })

  it('filterRoutesByRequiredTags', (done) => {
    const routes = [{
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['Hapi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['api', 'Hapi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['api', 'Joi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: 'Joi'
      }
    }, {
      path: '/dev',
      method: 'post',
      settings: {}
    }, {
      path: '/dev',
      method: 'get'
    }]

    Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi'])).to.have.length(2)
    Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi', 'api'])).to.have.length(1)
    // TODO: hm?
    Code.expect(utils.filterRoutesByRequiredTags(routes, [])).to.have.length(6)
    Code.expect(utils.filterRoutesByRequiredTags(routes, null)).to.have.length(6)

    done()
  })

  it('filterRoutesByTagSelection', (done) => {
    const routes = [{
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['Hapi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['api', 'Hapi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: ['api', 'Joi']
      }
    }, {
      path: '/dev/null',
      method: 'get',
      settings: {
        tags: 'Joi'
      }
    }, {
      path: '/dev',
      method: 'post',
      settings: {}
    }, {
      path: '/dev',
      method: 'get'
    }]

    Code.expect(utils.filterRoutesByTagSelection(routes, [], [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, null, [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, [], null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, null, null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], [])).to.have.length(2)
    Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], ['api'])).to.have.length(1)
    Code.expect(utils.filterRoutesByTagSelection(routes, [], ['api'])).to.have.length(4)

    done()
  })

  describe('parseTags', () => {
    it('#1', (done) => {
      Code.expect(utils.parseTags(null)).to.equal(null)
      Code.expect(utils.parseTags('')).to.equal(null)
      Code.expect(utils.parseTags([])).to.equal(null)
      Code.expect(utils.parseTags(['api'])).to.equal({
        included: ['api'],
        excluded: []
      })
      Code.expect(utils.parseTags(['api'].join(','))).to.equal({
        included: ['api'],
        excluded: []
      })
      Code.expect(utils.parseTags(['+api'])).to.equal({
        included: ['api'],
        excluded: []
      })
      Code.expect(utils.parseTags(['+api'].join(','))).to.equal({
        included: ['api'],
        excluded: []
      })
      Code.expect(utils.parseTags(['-api'])).to.equal({
        included: [],
        excluded: ['api']
      })
      Code.expect(utils.parseTags(['-api'].join(','))).to.equal({
        included: [],
        excluded: ['api']
      })
      Code.expect(utils.parseTags(['-api', '+beta'])).to.equal({
        included: ['beta'],
        excluded: ['api']
      })
      Code.expect(utils.parseTags(['-api', '+beta'].join(','))).to.equal({
        included: ['beta'],
        excluded: ['api']
      })
      Code.expect(utils.parseTags(['+api', '+beta'])).to.equal({
        included: ['api', 'beta'],
        excluded: []
      })
      Code.expect(utils.parseTags(['+api', '+beta'].join(','))).to.equal({
        included: ['api', 'beta'],
        excluded: []
      })
      done()
    })
  })

  describe('filterRoutesByPrefix', () => {
    it('#1', (done) => {
      const extractAPIKeys = utils.filterRoutesByPrefix([{
        path: '/',
        method: 'get'
      }, {
        path: '/dev',
        method: 'post'
      }, {
        path: '/dev',
        method: 'get'
      }, {
        path: '/dev/null',
        method: 'get'
      }], 'dev')

      Code.expect(extractAPIKeys).to.equal([{
        path: '/dev',
        method: 'post'
      }, {
        path: '/dev',
        method: 'get'
      }, {
        path: '/dev/null',
        method: 'get'
      }])

      done()
    })
  })

  describe('groupRoutesByPath', () => {
    it('#1', (done) => {
      const extractAPIKeys = utils.groupRoutesByPath([{
        path: '/',
        method: 'get'
      }, {
        path: '/dev',
        method: 'post'
      }, {
        path: '/dev',
        method: 'get'
      }, {
        path: '/dev/null',
        method: 'get'
      }])

      Code.expect(extractAPIKeys).to.equal({
        '/': [{
          path: '/',
          method: 'get'
        }],
        '/dev': [{
          path: '/dev',
          method: 'post'
        }, {
          path: '/dev',
          method: 'get'
        }],
        '/dev/null': [{
          path: '/dev/null',
          method: 'get'
        }]
      })
      done()
    })

    it('#2', (done) => {
      const routesWithOptionalPathParams = utils.groupRoutesByPath([{
        path: '/test',
        method: 'get'
      }, {
        path: '/test/{nonOptionalParam}/{optionalParam?}',
        method: 'get'
      }, {
        path: '/test/{nonOptionalParam}/{optionalParam?}',
        method: 'put'
      }])

      Code.expect(routesWithOptionalPathParams).to.equal({
        '/test': [{
          path: '/test',
          method: 'get'
        }],
        '/test/{nonOptionalParam}': [{
          path: '/test/{nonOptionalParam}',
          method: 'get'
        }, {
          path: '/test/{nonOptionalParam}',
          method: 'put'
        }],
        '/test/{nonOptionalParam}/{optionalParam}': [{
          path: '/test/{nonOptionalParam}/{optionalParam?}',
          method: 'get'
        }, {
          path: '/test/{nonOptionalParam}/{optionalParam?}',
          method: 'put'
        }]
      })
      done()
    })
  })

  describe('extractAPIKeys', () => {
    it('#1', (done) => {
      const extractAPIKeys = utils.extractAPIKeys([{
        path: '/',
        method: 'get'
      }, {
        path: '/dev',
        method: 'post'
      }, {
        path: '/dev',
        method: 'get'
      }, {
        path: '/dev/null',
        method: 'get'
      }])

      Code.expect(extractAPIKeys).to.equal(['/dev'])
      done()
    })

    it('#2', (done) => {
      const extractAPIKeys = utils.extractAPIKeys([{
        path: '/'
      }, {
        path: '/zdsa'
      }, {
        path: '/dev'
      }, {
        path: '/asdf'
      }, {
        path: '/asdf'
      }, {
        path: '/dev/null'
      }])

      Code.expect(extractAPIKeys).to.equal(['/asdf', '/dev', '/zdsa'])
      done()
    })
  })

  describe('generateFallbackName', () => {
    it('#1', (done) => {
      Code.expect(utils.generateFallbackName(null)).to.equal(null)
      Code.expect(utils.generateFallbackName(undefined)).to.equal(null)
      Code.expect(utils.generateFallbackName('')).to.equal(null)
      Code.expect(utils.generateFallbackName('Model')).to.equal('Model_2')
      Code.expect(utils.generateFallbackName('Model_2')).to.equal('Model_3')
      Code.expect(utils.generateFallbackName('Model_999999')).to.equal('Model_1000000')

      done()
    })
  })

  describe('generateRouteNickname', () => {
    it('#1', (done) => {
      Code.expect(utils.generateRouteNickname({method: 'get', path: '/path/to/{somthing}'})).to.equal('get_path_to__somthing_')
      done()
    })
  })

  describe('isPrimitiveSwaggerType', () => {
    it('#1', (done) => {
      _.each(['integer', 'number', 'string', 'boolean', 'string'], (type) => {
        Code.expect(utils.isPrimitiveSwaggerType(type)).to.equal(true)
      })

      Code.expect(utils.isPrimitiveSwaggerType(null)).to.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType(undefined)).to.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType('')).to.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType('asdf123')).to.equal(false)

      done()
    })
  })

  describe('setNotEmpty', () => {
    it('#1', (done) => {
      Code.expect(utils.setNotEmpty({}, 'key', 'value').key).to.be.equal('value')
      Code.expect(utils.setNotEmpty({}, 'key', 'value').key).to.be.equal('value')
      Code.expect(utils.setNotEmpty({}, 'key', undefined).key).not.to.exist()
      Code.expect(utils.setNotEmpty({}, 'key', null).key).not.to.exist()
      Code.expect(utils.setNotEmpty({}, 'key', []).key).not.to.exist()
      done()
    })
  })

  describe('getPrimitiveType', () => {
    it('#1', (done) => {
      Code.expect(utils.getPrimitiveType(Joi.string())).to.be.equal('string')
      Code.expect(utils.getPrimitiveType(Joi.number())).to.be.equal('number')
      Code.expect(utils.getPrimitiveType(Joi.number().integer())).to.be.equal('integer')
      done()
    })
  })
  describe('isSupportedSchema', () => {
    it('#1', (done) => {
      Code.expect(utils.isSupportedSchema(Joi.string())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.array())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.boolean())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.binary())).to.be.false()
      Code.expect(utils.isSupportedSchema(Joi.date())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.func())).to.be.false()
      Code.expect(utils.isSupportedSchema(Joi.object({}))).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.alternatives({}))).to.be.false()
      Code.expect(utils.isSupportedSchema(Joi.number())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.number().integer())).to.be.true()
      Code.expect(utils.isSupportedSchema(Joi.any())).to.be.false()
      Code.expect(utils.isSupportedSchema(null)).to.be.false()
      Code.expect(utils.isSupportedSchema({})).to.be.false()
      Code.expect(utils.isSupportedSchema({ isJoi: true })).to.be.false()
      Code.expect(utils.isSupportedSchema({ isJoi: false })).to.be.false()
      done()
    })
  })

  describe('getMeta', () => {
    it('#1', (done) => {
      Code.expect(utils.getMeta(Joi.object().meta({className: 'myClassName'}), 'className')).to.be.equal('myClassName')
      Code.expect(utils.getMeta({_settings: {className: 'myClassName'}}, 'className')).to.be.equal('myClassName')
      Code.expect(utils.getMeta(undefined, 'className')).to.be.equal(undefined)
      Code.expect(utils.getMeta(null, 'className')).to.be.equal(undefined)
      done()
    })
  })

  describe('getSettings', () => {
    it('#1', (done) => {
      Code.expect(utils.getMeta(Joi.object().meta({className: 'myClassName'}), 'className')).to.be.equal('myClassName')
      done()
    })
  })

  describe('getPathPrefix', (n) => {
    it('#1', (done) => {
      Code.expect(utils.getPathPrefix('/test1/test2')).to.be.equal('test1')
      Code.expect(utils.getPathPrefix('/test1/test2/test3')).to.be.equal('test1')
      Code.expect(utils.getPathPrefix('/test1/test2/test3', 2)).to.be.equal('test1/test2')
      Code.expect(utils.getPathPrefix('/test1', 5)).to.be.equal('test1')
      Code.expect(utils.getPathPrefix('/test1', -1)).to.be.equal('test1')
      Code.expect(utils.getPathPrefix('/', -1)).to.be.equal('')
      Code.expect(utils.getPathPrefix(null, -1)).to.be.equal(null)
      done()
    })
  })

  describe('getPathTags', (n) => {
    it('#1', (done) => {
      Code.expect(utils.getPathTags('/test1/test2')).to.be.equal(['test1'])
      Code.expect(utils.getPathTags('/test1/test2/test3')).to.be.equal(['test1'])
      Code.expect(utils.getPathTags('/test1/test2/test3', 2)).to.be.equal(['test1/test2'])
      Code.expect(utils.getPathTags('/test1', 5)).to.be.equal(['test1'])
      Code.expect(utils.getPathTags('/test1', -1)).to.be.equal(['test1'])
      Code.expect(utils.getPathTags('/', -1)).to.be.equal([])
      Code.expect(utils.getPathTags('', -1)).to.be.equal([])
      Code.expect(utils.getPathTags(null, -1)).to.be.equal([])
      done()
    })
  })

  describe('getDescription', () => {
    it('#1', (done) => {
      Code.expect(utils.getDescription(Joi.object().meta({className: 'myClassName'}))).to.not.exist()
      Code.expect(utils.getDescription(Joi.object().meta({className: 'myClassName', description: 'test'}))).to.equal('test')
      done()
    })
  })

  describe('getTags', () => {
    it('#1', (done) => {
      Code.expect(utils.getTags({tags: []})).to.equal([])
      Code.expect(utils.getTags({tags: { test: 'test123' }})).to.equal([{name: 'test', description: 'test123'}])
      Code.expect(utils.getTags({tags: [{ name: 'test', description: 'test123' }]})).to.equal([{name: 'test', description: 'test123'}])
      const example = {name: 'test', description: 'test123', externalDocs: {description: 'Find out more about our store', url: 'http://swagger.io'}}
      Code.expect(utils.getTags({tags: [example]})).to.equal([example])
      done()
    })

    it('#2', (done) => {
      const example = {name: 'test', description: 'test123', externalDocs: {description: 'Find out more about our store', url: 'http://swagger.io'}}
      Joi.assert(
        utils.getTags({tags: [example]}),
        Joi.array().items(schema.Tag),
        'Tag schema doesnt fit'
      )
      Joi.assert(
        utils.getTags({tags: { test: 'test123' }}),
        Joi.array().items(schema.Tag),
        'Tag schema doesnt fit'
      )
      done()
    })
  })

  describe('adjustOptionalPathParams', () => {
    it('#1', (done) => {
      const testParams = [{
        required: true,
        type: 'string',
        name: 'paramOne',
        in: 'path'
      },
      {
        required: true,
        type: 'string',
        name: 'paramTwo',
        in: 'path'
      }]
      Code.expect(utils.adjustOptionalPathParams('/test/{paramOne}/{paramTwo}', testParams)).to.equal(testParams)
      Code.expect(utils.adjustOptionalPathParams('/test/{paramOne}', testParams)).to.equal([{
        required: true,
        type: 'string',
        name: 'paramOne',
        in: 'path'
      }])
      done()
    })
  })
})
