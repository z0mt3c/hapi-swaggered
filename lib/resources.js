var _ = require('lodash')
var utils = require('./utils')
var Hoek = require('hoek')
var generator = require('./generator')
var schema = require('./schema')
var Joi = require('joi')

var internals = {
  prepareRequestParameters: function (definitions, scope, schema) {
    var swaggerProperties = generator.createProperties(schema, definitions)
    var paramsProperties = _.map(swaggerProperties, function (property, key) {
      property.name = key
      property.in = scope
      return property
    })
    return paramsProperties
  },
  preparePayloadSchema: function (definitions, schema) {
    var swaggerSchema = generator.fromJoiSchema(schema, definitions)
    swaggerSchema = generator.extractAsDefinition(schema, definitions, swaggerSchema)
    swaggerSchema.in = 'body'

    if (swaggerSchema.$ref) {
      swaggerSchema.name = swaggerSchema.$ref
      swaggerSchema.schema = {$ref: '#/definitions/' + swaggerSchema.$ref}
      delete swaggerSchema.$ref
    } else {
      swaggerSchema.name = 'Payload'
    }

    return swaggerSchema
  },
  prepareResponseSchema: function (definitions, schema) {
    var swaggerSchema = generator.fromJoiSchema(schema, definitions)
    swaggerSchema.description = utils.getResponseDescription(schema)

    if (swaggerSchema.$ref) {
      swaggerSchema.schema = {$ref: '#/definitions/' + swaggerSchema.$ref}
    } else if (swaggerSchema.type === 'array') {
      var items = swaggerSchema.items

      if (items && items.$ref) {
        items.$ref = '#/definitions/' + items.$ref
      }

      swaggerSchema.schema = {
        type: 'array',
        items: items,
        description: swaggerSchema.description
      }

      delete swaggerSchema.type
      delete swaggerSchema.items
    } else if (utils.isPrimitiveSwaggerType(swaggerSchema.type)) {
      // TODO: write tests... including primitive response types
      swaggerSchema.schema = _.pick(swaggerSchema, ['type', 'description' ])
    }

    if (!swaggerSchema.description) {
      swaggerSchema.description = ''
    }

    delete swaggerSchema.$ref
    delete swaggerSchema.type
    delete swaggerSchema.required
    return swaggerSchema
  },
  prepareResponses: function (definitions, pluginOptions, defaultResponseSchema, statusResponseSchema) {
    var responses = {default: {}}
    var pluginResponses = (pluginOptions ? pluginOptions.responses : undefined) || {}
    responses = _.reduce(pluginResponses, function (memo, pluginResponseType, key) {
      var responseType = pluginResponseType.schema ? internals.prepareResponseSchema(definitions, pluginResponseType.schema) : {}
      responseType.description = pluginResponseType.description
      memo[key] = responseType
      return memo
    }, responses)

    var statusResponses = Hoek.merge({default: defaultResponseSchema}, statusResponseSchema)
    responses = _.reduce(statusResponses, function (memo, responseSchema, key) {
      if (!responseSchema) {
        return memo
      }

      var memoType = memo[key]
      var responseType = internals.prepareResponseSchema(definitions, responseSchema)
      memo[key] = memoType ? Hoek.merge(memoType, responseType) : responseType

      return memo
    }, responses)
    return responses
  }
}

module.exports = function (settings, routes, tags) {
  routes = utils.filterRoutesByRequiredTags(routes, settings.requiredTags)

  if (settings.stripPrefix) {
    routes = utils.stripRoutesPrefix(routes, settings.stripPrefix)
  }

  var parsedTags = utils.parseTags(tags)

  if (parsedTags) {
    routes = utils.filterRoutesByTagSelection(routes, parsedTags.included, parsedTags.excluded)
  }

  routes = _.sortBy(routes, 'path')

  var routesByPath = utils.groupRoutesByPath(routes)
  var definitions = {}

  var paths = _.reduce(routesByPath, function (pathsMemo, routes, path) {
    var operations = _.reduce(routes, function (operationsMemo, route) {
      var parameters = []
      var operation = {}

      // Process request
      Hoek.assert(route.method, 'Really? No HTTP Method?')
      Hoek.assert(route.settings, 'Route settings missing')
      var routeSettings = route.settings
      Hoek.assert(routeSettings.validate, 'Route settings incomplete (validate expected to be always present)')
      Hoek.assert(routeSettings.validate, 'Route settings incomplete (validate expected to be always present)')
      var validations = routeSettings.validate
      Hoek.assert(routeSettings.plugins, 'Route settings incomplete (plugins expected to be always present)')

      var query = validations.query
      var params = validations.params
      var header = validations.headers
      var payload = validations.payload

      if (params) {
        var paramsProperties = internals.prepareRequestParameters(definitions, 'path', params)
        parameters = parameters.concat(paramsProperties)
      }

      if (query) {
        var queryProperties = internals.prepareRequestParameters(definitions, 'query', query)
        parameters = parameters.concat(queryProperties)
      }

      if (header) {
        var headerProperties = internals.prepareRequestParameters(definitions, 'header', header)
        parameters = parameters.concat(headerProperties)
      }

      if (payload) {
        var allowedMimeType = Hoek.reach(routeSettings, 'payload.allow')

        if (Hoek.intersect(allowedMimeType, ['application/x-www-form-urlencoded', 'multipart/form-data']).length > 0) {
          var formProperties = internals.prepareRequestParameters(definitions, 'formData', payload)
          parameters = parameters.concat(formProperties)
          operation.consumes = allowedMimeType
        } else {
          var payloadSchema = internals.preparePayloadSchema(definitions, payload)
          parameters = parameters.concat(payloadSchema)
          operation.consumes = settings.consumes
        }

        utils.setNotEmpty(operation, 'consumes', allowedMimeType)
      }

      var routesPluginOptions = routeSettings.plugins['hapi-swaggered']
      Joi.assert(routesPluginOptions, schema.RoutesPluginOptions)
      var defaultResponseSchema = Hoek.reach(routeSettings, 'response.schema')
      var statusResponseSchema = Hoek.reach(routeSettings, 'response.status')

      // Process response
      var responses = internals.prepareResponses(definitions, routesPluginOptions, defaultResponseSchema, statusResponseSchema)
      operation.responses = responses
      operation.produces = settings.produces

      var tags = routeSettings.tags
      utils.setNotEmpty(operation, 'tags', tags)
      utils.setNotEmpty(operation, 'parameters', parameters)
      utils.setNotEmpty(operation, 'summary', routeSettings.description)
      utils.setNotEmpty(operation, 'description', routeSettings.notes)

      if (_.contains(tags, 'deprecated')) {
        operation.deprecated = true
      }

      if (route.method === '*') {
        _.each(settings.supportedMethods, function (method) {
          operationsMemo[method] = operation
        })
      } else {
        Hoek.assert(_.contains(settings.supportedMethods, route.method.toLowerCase()), 'No supported http method: ' + route.method)
        operationsMemo[route.method] = operation
      }

      return operationsMemo
    }, {})

    pathsMemo[path] = operations
    return pathsMemo
  }, {})

  return {
    paths: paths,
    definitions: definitions
  }
}
