var _ = require('lodash')
var utils = require('./utils')
var Hoek = require('hoek')
var generator = require('./generator')
var schema = require('./schema')
var Joi = require('joi')

var internals = {
  prepareRequestParameters: function (definitions, scope, schema) {
    var swaggerProperties = generator.createProperties(schema, definitions)
    var paramsProperties = _.reduce(swaggerProperties, function (memo, property, key) {
      // TODO: deal with nested query and formData parameters -> for now strip it!
      if (property.$ref == null) {
        property.name = key
        property.in = scope
        memo.push(property)
      }

      return memo
    }, [])
    return paramsProperties
  },
  preparePayloadSchema: function (definitions, schema) {
    var swaggerSchema = generator.fromJoiSchema(schema, definitions)
    swaggerSchema = generator.extractAsDefinition(schema, definitions, swaggerSchema)
    swaggerSchema.in = 'body'

    if (swaggerSchema.$ref) {
      swaggerSchema.name = swaggerSchema.$ref.substr(14)
      swaggerSchema.schema = _.pick(swaggerSchema, ['$ref'])
      delete swaggerSchema.$ref
    } else {
      swaggerSchema.name = 'Payload'
      swaggerSchema.schema = _.pick(swaggerSchema, ['type', 'description'])
      delete swaggerSchema.type
    }

    return swaggerSchema
  },
  prepareResponseSchema: function (definitions, schema) {
    var swaggerSchema = generator.fromJoiSchema(schema, definitions)
    swaggerSchema.description = utils.getResponseDescription(schema)

    if (swaggerSchema.$ref) {
      swaggerSchema.schema = {$ref: swaggerSchema.$ref}
    } else if (swaggerSchema.type === 'array') {
      var items = swaggerSchema.items

      swaggerSchema.schema = {
        type: 'array',
        items: items,
        description: swaggerSchema.description
      }

      delete swaggerSchema.type
      delete swaggerSchema.items
    } else {
      swaggerSchema.schema = _.pick(swaggerSchema, ['type', 'description'])
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
    var responses = {default: {description: ''}}
    var pluginResponses = pluginOptions.responses || {}
    responses = _.reduce(pluginResponses, function (memo, pluginResponseType, key) {
      var responseType = utils.isSupportedSchema(pluginResponseType.schema) ? internals.prepareResponseSchema(definitions, pluginResponseType.schema) : {}
      if (pluginResponseType.type != null) {
        responseType.schema = { type: pluginResponseType.type }
      }
      responseType.description = pluginResponseType.description
      memo[key] = responseType
      return memo
    }, responses)

    var statusResponses = Hoek.merge({default: defaultResponseSchema}, statusResponseSchema)
    responses = _.reduce(statusResponses, function (memo, responseSchema, key) {
      if (utils.isSupportedSchema(responseSchema)) {
        var memoType = memo[key]
        var responseType = internals.prepareResponseSchema(definitions, responseSchema)
        memo[key] = memoType ? Hoek.merge(memoType, responseType) : responseType
      }

      return memo
    }, responses)
    return responses
  },
  prepareTags: function (path, tags, settings) {
    var tagging = settings.tagging

    if (tagging.mode === 'tags') {
      if (tagging.stripRequiredTags === true) {
        tags = _.difference(tags, settings.requiredTags)
      }
      if (tagging.stripAdditionalTags && tagging.stripAdditionalTags.length) {
        tags = _.difference(tags, tagging.stripAdditionalTags)
      }
    } else {
      return utils.getPathTags(path, tagging.pathLevel)
    }

    return tags
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

      if (utils.isSupportedSchema(payload)) {
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

      var routesPluginOptions = routeSettings.plugins['hapi-swaggered'] || {}
      Joi.assert(routesPluginOptions, schema.RoutesPluginOptions)
      var defaultResponseSchema = Hoek.reach(routeSettings, 'response.schema')
      var statusResponseSchema = Hoek.reach(routeSettings, 'response.status')

      // Process response
      var responses = internals.prepareResponses(definitions, routesPluginOptions, defaultResponseSchema, statusResponseSchema)
      operation.responses = responses
      operation.produces = routesPluginOptions.produces || settings.produces

      if (routesPluginOptions.operationId != null) {
        operation.operationId = routesPluginOptions.operationId
      }

      if (_.contains(routeSettings.tags, 'deprecated')) {
        operation.deprecated = true
      }

      if (routesPluginOptions.custom) {
        operation = _.merge(operation, routesPluginOptions.custom)
      }

      utils.setNotEmpty(operation, 'tags', internals.prepareTags(path, routeSettings.tags, settings))
      utils.setNotEmpty(operation, 'parameters', parameters)
      utils.setNotEmpty(operation, 'summary', routeSettings.description)
      utils.setNotEmpty(operation, 'description', routeSettings.notes)

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
