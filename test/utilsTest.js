var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var describe = lab.describe
var it = lab.it
var Joi = require('joi')
var utils = require('../lib/utils')
var _ = require('lodash')
var Hapi = require('hapi')
var dummyHandler = function (request, reply) {
  return reply('ok')
}

describe('utils', function () {
  describe('getMeta', function () {
    it('#1', function (done) {
      Code.expect(utils.getMeta(null, 'test')).to.deep.equal(undefined)
      done()
    })
  })

  describe('getDescription', function () {
    it('#1', function (done) {
      Code.expect(utils.getDescription(null, 'test')).to.deep.equal(undefined)
      Code.expect(utils.getDescription(null, null)).to.deep.equal(undefined)
      Code.expect(utils.getDescription({descriptions: null}, 'Test')).to.deep.equal(undefined)
      Code.expect(utils.getDescription({descriptions: {test: 'Test'}}, '/test')).to.deep.equal('Test')
      Code.expect(utils.getDescription({descriptions: {test: 'Test'}}, 'test')).to.deep.equal('Test')
      Code.expect(utils.getDescription({descriptions: {test: 'Test'}}, null)).to.deep.equal(undefined)
      done()
    })
  })

  describe('getRequestConnection', function () {
    it('#1', function (done) {
      Code.expect(utils.getRequestConnection({connection: 'a', server: 'b'})).to.deep.equal('a')
      Code.expect(utils.getRequestConnection({server: 'b'})).to.deep.equal('b')
      Code.expect(utils.getRequestConnection({})).to.not.exist
      done()
    })
  })

  describe('getRouteModifiers', function () {
    it('#1', function (done) {
      Code.expect(utils.getRoutesModifiers({config: 'test'})).to.deep.equal('test')
      Code.expect(utils.getRoutesModifiers({realm: {modifiers: 'test'}})).to.deep.equal('test')
      Code.expect(utils.getRoutesModifiers({})).to.not.exist
      done()
    })
  })

  describe('firstCharToUpperCase', function () {
    it('#1', function (done) {
      Code.expect(utils.firstCharToUpperCase(null)).to.deep.equal(null)
      Code.expect(utils.firstCharToUpperCase('')).to.deep.equal('')
      Code.expect(utils.firstCharToUpperCase('a')).to.deep.equal('A')
      Code.expect(utils.firstCharToUpperCase('joi')).to.deep.equal('Joi')
      done()
    })
  })

  describe('getCurrentSettings', function () {
    it('#1', function (done) {
      var settings = {source: 'plugin', settings: {plugin: true}}
      var serverSettings = {source: 'server', settings: {server: true}}
      Code.expect(utils.getCurrentSettings(null)).to.deep.equal(null)
      Code.expect(utils.getCurrentSettings(settings)).to.deep.equal(settings)
      Code.expect(utils.getCurrentSettings(settings, serverSettings)).to.deep.equal({
        source: 'server',
        settings: {plugin: true, server: true}
      })
      done()
    })
  })

  describe('stripRoutesPrefix', function () {
    it('#1', function (done) {
      Code.expect(utils.stripRoutesPrefix(null)).to.be.null
      Code.expect(utils.stripRoutesPrefix([])).to.have.length(0)
      Code.expect(utils.stripRoutesPrefix([{path: '/api/test'}], '/api')).to.have.length(1)
      Code.expect(utils.stripRoutesPrefix([{path: '/api/test'}], '/test')).to.have.length(0)
      // empty route path will be stripped - correct?
      Code.expect(utils.stripRoutesPrefix([{path: '/api'}], '/api')).to.have.length(0)
      done()
    })
  })

  describe('extractBaseHost', function () {
    it('#1', function (done) {
      Code.expect(utils.extractBaseHost({protocol: 'hapi'}, {headers: {}})).to.deep.equal('hapi://localhost')
      Code.expect(utils.extractBaseHost({
        protocol: 'hapi',
        host: 'abc'
      }, {headers: {host: 'localhost'}})).to.deep.equal('hapi://abc')
      Code.expect(utils.extractBaseHost({protocol: 'hapi'}, {headers: {host: 'localhost'}})).to.deep.equal('hapi://localhost')
      Code.expect(utils.extractBaseHost({protocol: 'hapi'}, {headers: {host: 'localhost:9000'}})).to.deep.equal('hapi://localhost:9000')
      Code.expect(utils.extractBaseHost({protocol: null}, {headers: {host: 'localhost:9000'}})).to.deep.equal('http://localhost:9000')
      Code.expect(utils.extractBaseHost({protocol: null}, {
        server: {info: {protocol: 'hapi'}},
        headers: {host: 'localhost:9000'}
      })).to.deep.equal('hapi://localhost:9000')
      done()
    })
  })

  describe('generateNameFromSchema', function () {
    it('#1', function (done) {
      Code.expect(utils.generateNameFromSchema({
        _inner: {
          children: [
            {key: 'test'},
            {key: 'test2'}
          ]
        }
      })).to.deep.equal('TestTest2Model')

      Code.expect(utils.generateNameFromSchema({
        _inner: {
          children: [
            {key: 'test'}
          ]
        }
      })).to.deep.equal('TestModel')

      Code.expect(utils.generateNameFromSchema({})).to.deep.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(null)).to.deep.equal('EmptyModel')

      done()
    })

    it('#2 Integration', function (done) {
      var schema = Joi.object().keys({
        name: Joi.string(),
        email: Joi.string()
      })

      Code.expect(utils.generateNameFromSchema(schema)).to.deep.equal('NameEmailModel')
      Code.expect(utils.generateNameFromSchema(Joi.object().keys({}))).to.deep.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(Joi.object())).to.deep.equal('EmptyModel')
      Code.expect(utils.generateNameFromSchema(Joi.array())).to.deep.equal('ArrayModel')
      Code.expect(utils.generateNameFromSchema(Joi.array().items(Joi.string()))).to.deep.equal('StringArrayModel')

      done()
    })
  })

  it('filterRoutesByRequiredTags', function (done) {
    var routes = [
      {path: '/dev/null', method: 'get', settings: {tags: ['Hapi']}},
      {path: '/dev/null', method: 'get', settings: {tags: ['api', 'Hapi']}},
      {path: '/dev/null', method: 'get', settings: {tags: ['api', 'Joi']}},
      {path: '/dev/null', method: 'get', settings: {tags: 'Joi'}},
      {path: '/dev', method: 'post', settings: {}},
      {path: '/dev', method: 'get'}
    ]

    Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi'])).to.have.length(2)
    Code.expect(utils.filterRoutesByRequiredTags(routes, ['Hapi', 'api'])).to.have.length(1)
    // TODO: hm?
    Code.expect(utils.filterRoutesByRequiredTags(routes, [])).to.have.length(6)
    Code.expect(utils.filterRoutesByRequiredTags(routes, null)).to.have.length(6)

    done()
  })

  it('filterRoutesByTagSelection', function (done) {
    var routes = [
      {path: '/dev/null', method: 'get', settings: {tags: ['Hapi']}},
      {path: '/dev/null', method: 'get', settings: {tags: ['api', 'Hapi']}},
      {path: '/dev/null', method: 'get', settings: {tags: ['api', 'Joi']}},
      {path: '/dev/null', method: 'get', settings: {tags: 'Joi'}},
      {path: '/dev', method: 'post', settings: {}},
      {path: '/dev', method: 'get'}
    ]

    Code.expect(utils.filterRoutesByTagSelection(routes, [], [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, null, [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, [], null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, null, null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], [])).to.have.length(2)
    Code.expect(utils.filterRoutesByTagSelection(routes, ['Hapi'], ['api'])).to.have.length(1)
    Code.expect(utils.filterRoutesByTagSelection(routes, [], ['api'])).to.have.length(4)

    done()
  })

  it('filterRoutesByTagSelection (integration)', function (done) {
    var routes = [
      {path: '/dev/a', method: 'GET', config: {handler: dummyHandler, tags: ['Hapi']}},
      {path: '/dev/b', method: 'GET', config: {handler: dummyHandler, tags: ['api', 'Hapi']}},
      {path: '/dev/c', method: 'GET', config: {handler: dummyHandler, tags: ['api', 'Joi']}},
      {path: '/dev/d', method: 'GET', config: {handler: dummyHandler, tags: 'Joi'}},
      {path: '/dev', method: 'POST', config: {handler: dummyHandler}},
      {path: '/dev', method: 'GET', config: {handler: dummyHandler}}
    ]

    var server = new Hapi.Server()
    server.connection({port: 80})
    server.route(routes)

    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), [], [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), null, [])).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), [], null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), null, null)).to.have.length(6)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), ['Hapi'], [])).to.have.length(2)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), ['Hapi'], ['api'])).to.have.length(1)
    Code.expect(utils.filterRoutesByTagSelection(server.connections[0].table(), [], ['api'])).to.have.length(4)

    done()
  })

  describe('parseTags', function () {
    it('#1', function (done) {
      Code.expect(utils.parseTags(null)).to.deep.equal(null)
      Code.expect(utils.parseTags('')).to.deep.equal(null)
      Code.expect(utils.parseTags([])).to.deep.equal(null)
      Code.expect(utils.parseTags(['api'])).to.deep.equal({included: ['api'], excluded: []})
      Code.expect(utils.parseTags(['api'].join(','))).to.deep.equal({included: ['api'], excluded: []})
      Code.expect(utils.parseTags(['+api'])).to.deep.equal({included: ['api'], excluded: []})
      Code.expect(utils.parseTags(['+api'].join(','))).to.deep.equal({included: ['api'], excluded: []})
      Code.expect(utils.parseTags(['-api'])).to.deep.equal({included: [], excluded: ['api']})
      Code.expect(utils.parseTags(['-api'].join(','))).to.deep.equal({included: [], excluded: ['api']})
      Code.expect(utils.parseTags(['-api', '+beta'])).to.deep.equal({included: ['beta'], excluded: ['api']})
      Code.expect(utils.parseTags(['-api', '+beta'].join(','))).to.deep.equal({included: ['beta'], excluded: ['api']})
      Code.expect(utils.parseTags(['+api', '+beta'])).to.deep.equal({included: ['api', 'beta'], excluded: []})
      Code.expect(utils.parseTags(['+api', '+beta'].join(','))).to.deep.equal({included: ['api', 'beta'], excluded: []})
      done()
    })
  })

  describe('filterRoutesByPrefix', function () {
    it('#1', function (done) {
      var extractAPIKeys = utils.filterRoutesByPrefix([
        {path: '/', method: 'get'},
        {path: '/dev', method: 'post'},
        {path: '/dev', method: 'get'},
        {path: '/dev/null', method: 'get'}
      ], 'dev')

      Code.expect(extractAPIKeys).to.deep.equal([
        {path: '/dev', method: 'post'},
        {path: '/dev', method: 'get'},
        {path: '/dev/null', method: 'get'}
      ])

      done()
    })
  })

  describe('filterRoutesByPrefix (Integration)', function () {
    it('#1', function (done) {
      var routes = [
        {path: '/', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev', method: 'post', config: {handler: dummyHandler}},
        {path: '/dev', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev/null', method: 'get', config: {handler: dummyHandler}},
        {path: '/abc/null', method: 'get', config: {handler: dummyHandler}}
      ]

      var server = new Hapi.Server()
      server.connection({port: 80})
      server.route(routes)

      var extractAPIKeys = utils.filterRoutesByPrefix(server.connections[0].table(), 'dev')
      Code.expect(extractAPIKeys).to.have.length(3)

      done()
    })
  })

  describe('groupRoutesByPath', function () {
    it('#1', function (done) {
      var extractAPIKeys = utils.groupRoutesByPath([
        {path: '/', method: 'get'},
        {path: '/dev', method: 'post'},
        {path: '/dev', method: 'get'},
        {path: '/dev/null', method: 'get'}
      ])

      Code.expect(extractAPIKeys).to.deep.equal({
        '/': [
          {path: '/', method: 'get'}
        ],
        '/dev': [
          {path: '/dev', method: 'post'},
          {path: '/dev', method: 'get'}
        ],
        '/dev/null': [
          {path: '/dev/null', method: 'get'}
        ]
      })
      done()
    })
  })

  describe('groupRoutesByPath (Integration)', function () {
    it('#1', function (done) {
      var routes = [
        {path: '/', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev', method: 'post', config: {handler: dummyHandler}},
        {path: '/dev', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev/null', method: 'get', config: {handler: dummyHandler}}
      ]

      var server = new Hapi.Server()
      server.connection({port: 80})
      server.route(routes)

      var extractAPIKeys = utils.groupRoutesByPath(server.connections[0].table())

      Code.expect(extractAPIKeys['/']).to.have.length(1)
      Code.expect(extractAPIKeys['/dev']).to.have.length(2)
      Code.expect(extractAPIKeys['/dev/null']).to.have.length(1)

      done()
    })
  })

  describe('extractAPIKeys', function () {
    it('#1', function (done) {
      var extractAPIKeys = utils.extractAPIKeys([
        {path: '/', method: 'get'},
        {path: '/dev', method: 'post'},
        {path: '/dev', method: 'get'},
        {path: '/dev/null', method: 'get'}
      ])

      Code.expect(extractAPIKeys).to.deep.equal(['/dev'])
      done()
    })

    it('#2', function (done) {
      var extractAPIKeys = utils.extractAPIKeys([
        {path: '/'},
        {path: '/zdsa'},
        {path: '/dev'},
        {path: '/asdf'},
        {path: '/asdf'},
        {path: '/dev/null'}
      ])

      Code.expect(extractAPIKeys).to.deep.equal(['/asdf', '/dev', '/zdsa'])
      done()
    })
  })

  describe('extractAPIKeys (Integration)', function () {
    it('#1', function (done) {
      var routes = [
        {path: '/', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev', method: 'post', config: {handler: dummyHandler}},
        {path: '/dev', method: 'get', config: {handler: dummyHandler}},
        {path: '/dev/null', method: 'get', config: {handler: dummyHandler}}
      ]

      var server = new Hapi.Server()
      server.connection({port: 80})
      server.route(routes)

      var extractAPIKeys = utils.extractAPIKeys(server.connections[0].table())
      Code.expect(extractAPIKeys).to.deep.equal(['/dev'])
      done()
    })

    it('#2', function (done) {
      var extractAPIKeys = utils.extractAPIKeys([
        {path: '/'},
        {path: '/zdsa'},
        {path: '/dev'},
        {path: '/asdf'},
        {path: '/asdf'},
        {path: '/dev/null'}
      ])

      Code.expect(extractAPIKeys).to.deep.equal(['/asdf', '/dev', '/zdsa'])
      done()
    })
  })

  describe('generateFallbackName', function () {
    it('#1', function (done) {
      Code.expect(utils.generateFallbackName(null)).to.deep.equal(null)
      Code.expect(utils.generateFallbackName(undefined)).to.deep.equal(null)
      Code.expect(utils.generateFallbackName('')).to.deep.equal(null)
      Code.expect(utils.generateFallbackName('Model')).to.deep.equal('Model_2')
      Code.expect(utils.generateFallbackName('Model_2')).to.deep.equal('Model_3')
      Code.expect(utils.generateFallbackName('Model_999999')).to.deep.equal('Model_1000000')

      done()
    })
  })
  describe('isPrimitiveSwaggerType', function () {
    it('#1', function (done) {
      _.each(['integer', 'number', 'string', 'boolean', 'string'], function (type) {
        Code.expect(utils.isPrimitiveSwaggerType(type)).to.deep.equal(true)
      })

      Code.expect(utils.isPrimitiveSwaggerType(null)).to.deep.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType(undefined)).to.deep.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType('')).to.deep.equal(false)
      Code.expect(utils.isPrimitiveSwaggerType('asdf123')).to.deep.equal(false)

      done()
    })
  })
  describe('setNotEmpty', function () {
    it('#1', function (done) {
      Code.expect(utils.setNotEmpty({}, 'key', 'value')).to.deep.include({'key': 'value'})
      Code.expect(utils.setNotEmpty({}, 'key', 'value')).to.deep.include({'key': 'value'})
      Code.expect(utils.setNotEmpty({}, 'key', undefined)).not.to.deep.include({'key': 'value'})
      Code.expect(utils.setNotEmpty({}, 'key', null)).not.to.deep.include({'key': 'value'})
      Code.expect(utils.setNotEmpty({}, 'key', [])).not.to.deep.include({'key': 'value'})
      done()
    })
  })
})
