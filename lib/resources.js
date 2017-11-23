'use strict'

const _ = require('lodash')
const utils = require('./utils')
const Hoek = require('hoek')
const generator = require('./generator')
let schema = require('./schema')
const Joi = require('joi')

const internals = {
  prepareRequestParameters (definitions, scope, schema) {
    const swaggerProperties = generator.createProperties(schema, definitions)
    const paramsProperties = _.reduce(swaggerProperties, (memo, property, key) => {
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
  preparePayloadSchema (definitions, schema) {
    let swaggerSchema = generator.fromJoiSchema(schema, definitions)
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
  prepareResponseSchema (definitions, schema) {
    const swaggerSchema = generator.fromJoiSchema(schema, definitions)
    swaggerSchema.description = utils.getDescription(schema)

    if (swaggerSchema.$ref) {
      swaggerSchema.schema = {$ref: swaggerSchema.$ref}
    } else if (swaggerSchema.type === 'array') {
      const items = swaggerSchema.items

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
  prepareResponses (definitions, pluginOptions, defaultResponseSchema, statusResponseSchema) {
    let responses = {default: {description: ''}}
    const pluginResponses = pluginOptions.responses || {}
    responses = _.reduce(pluginResponses, (memo, pluginResponseType, key) => {
      const responseType = utils.isSupportedSchema(pluginResponseType.schema) ? internals.prepareResponseSchema(definitions, pluginResponseType.schema) : {}
      if (pluginResponseType.type != null) {
        responseType.schema = { type: pluginResponseType.type }
      }
      responseType.description = pluginResponseType.description
      memo[key] = responseType

      return memo
    }, responses)

    const statusResponses = _.merge({default: defaultResponseSchema}, statusResponseSchema)
    responses = _.reduce(statusResponses, (memo, responseSchema, key) => {
      if (utils.isSupportedSchema(responseSchema)) {
        const memoType = memo[key]
        const responseType = internals.prepareResponseSchema(definitions, responseSchema)
        memo[key] = memoType ? _.merge(memoType, responseType) : responseType
      }

      return memo
    }, responses)

    return responses
  },
  prepareTags (path, tags, settings) {
    const tagging = settings.tagging

    if (tagging.mode !== 'tags') {
      return utils.getPathTags(path, tagging.pathLevel)
    }

    if (tagging.stripRequiredTags === true) {
      tags = _.difference(tags, settings.requiredTags)
    }

    if (tagging.stripAdditionalTags && tagging.stripAdditionalTags.length) {
      tags = _.difference(tags, tagging.stripAdditionalTags)
    }

    return tags
  }
}

module.exports = function (settings, routes, tags) {
  routes = utils.filterRoutesByRequiredTags(routes, settings.requiredTags)

  if (settings.stripPrefix) {
    routes = utils.stripRoutesPrefix(routes, settings.stripPrefix)
  }

  const parsedTags = utils.parseTags(tags)

  if (parsedTags) {
    routes = utils.filterRoutesByTagSelection(routes, parsedTags.included, parsedTags.excluded)
  }

  routes = _.sortBy(routes, 'path')

  const routesByPath = utils.groupRoutesByPath(routes)
  const definitions = {}

  const paths = _.reduce(routesByPath, (pathsMemo, routes, path) => {
    const operations = _.reduce(routes, (operationsMemo, route) => {
      let parameters = []
      let operation = {}

      // Process request
      Hoek.assert(route.method, 'Really? No HTTP Method?')
      Hoek.assert(route.settings, 'Route settings missing')
      const routeSettings = route.settings
      Hoek.assert(
        routeSettings.validate,
        'Route settings incomplete (validate expected to be always present)'
      )
      const validations = routeSettings.validate
      Hoek.assert(
        routeSettings.plugins,
        'Route settings incomplete (plugins expected to be always present)'
      )

      const query = validations.query
      const params = validations.params
      const header = validations.headers
      const payload = validations.payload

      if (params) {
        const paramsProperties = internals.prepareRequestParameters(definitions, 'path', params)
        parameters = parameters.concat(paramsProperties)
      }

      if (query) {
        const queryProperties = internals.prepareRequestParameters(definitions, 'query', query)
        parameters = parameters.concat(queryProperties)
      }

      if (header) {
        const headerProperties = internals.prepareRequestParameters(definitions, 'header', header)
        parameters = parameters.concat(headerProperties)
      }

      if (utils.isSupportedSchema(payload)) {
        const allowedMimeType = _.get(routeSettings, 'payload.allow')

        if (Hoek.intersect(allowedMimeType, ['application/x-www-form-urlencoded', 'multipart/form-data']).length > 0) {
          const formProperties = internals.prepareRequestParameters(definitions, 'formData', payload)
          parameters = parameters.concat(formProperties)
          operation.consumes = allowedMimeType
        } else {
          const payloadSchema = internals.preparePayloadSchema(definitions, payload)
          parameters = parameters.concat(payloadSchema)
          operation.consumes = settings.consumes
        }

        utils.setNotEmpty(operation, 'consumes', allowedMimeType)
      }

      const routesPluginOptions = routeSettings.plugins['hapi-swaggered'] || {}
      Joi.assert(routesPluginOptions, schema.RoutesPluginOptions)
      const defaultResponseSchema = _.get(routeSettings, 'response.schema')
      const statusResponseSchema = _.get(routeSettings, 'response.status')

      // Process response
      let responses = internals.prepareResponses(definitions, routesPluginOptions, defaultResponseSchema, statusResponseSchema)
      operation.responses = responses
      operation.produces = routesPluginOptions.produces || settings.produces

      if (routesPluginOptions.operationId != null) {
        operation.operationId = routesPluginOptions.operationId
      }

      if (_.includes(routeSettings.tags, 'deprecated')) {
        operation.deprecated = true
      }

      if (routesPluginOptions.custom) {
        operation = _.merge(operation, routesPluginOptions.custom)
      }

      parameters = utils.adjustOptionalPathParams(path, parameters)

      utils.setNotEmpty(
        operation,
        'tags',
        internals.prepareTags(path, routeSettings.tags, settings)
      )
      utils.setNotEmpty(operation, 'parameters', parameters)
      utils.setNotEmpty(operation, 'summary', routeSettings.description)
      utils.setNotEmpty(operation, 'description', routeSettings.notes)

      if (route.method === '*') {
        _.each(settings.supportedMethods, (method) => {
          operationsMemo[method] = operation
        })
      } else {
        Hoek.assert(
          _.includes(settings.supportedMethods, route.method.toLowerCase()),
          `No supported http method: ${route.method}`
        )
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
