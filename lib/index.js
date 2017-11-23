'use strict'

const Hoek = require('hoek')
const Joi = require('joi')
const _ = require('lodash')
const Schema = require('./schema')
const utils = require('./utils')

const SWAGGER_VERSION = '2.0'
const defaultOptions = require('./defaults')

module.exports = {
  pkg: require('../package.json'),
  register
}

function register (plugin, options) {
  const settings = Hoek.applyToDefaults(defaultOptions, options)
  Joi.assert(options, Schema.PluginOptions)

  settings.pluginRoutePrefix = plugin.realm.modifiers.route.prefix || ''
  const pluginRouteConfig = settings.routeConfig || {}
  const internals = {
    resources: require('./resources'),
    keyGenerator (request) {
      return `hapi-swaggered:${request.server.info.uri}:${request.url.path}`
    }
  }

  const methods = {
    resources (request) {
      const serverSettings = _.get(request.server, 'settings.app.swagger')
      const currentSettings = utils.getCurrentSettings(settings, serverSettings)
      const resources = internals.resources(currentSettings, request.server.table(), request.query.tags)

      const data = {
        swagger: SWAGGER_VERSION,
        schemes: currentSettings.schemes,
        externalDocs: currentSettings.externalDocs,
        paths: resources.paths,
        definitions: resources.definitions,
        tags: utils.getTags(currentSettings)
      }

      utils.setNotEmpty(data, 'host', currentSettings.host)
      utils.setNotEmpty(data, 'info', currentSettings.info)
      utils.setNotEmpty(data, 'basePath', settings.stripPrefix)

      if (settings.basePath) {
        data.basePath = settings.basePath + (data.basePath ? data.basePath : '')
      }

      return data
    }
  }

  let resourcesGenerator = methods.resources

  if (settings.cache !== false) {
    plugin.method('resources', resourcesGenerator, {
      cache: settings.cache,
      generateKey: internals.keyGenerator
    })

    resourcesGenerator = plugin.methods.resources
  }

  const handler = {
    resources (request) {
      return resourcesGenerator(request, (error, data) => {
        Hoek.assert(!error, 'swagger-resource generation failed')

        const serverSettings = _.get(request.server, 'settings.app.swagger')
        const currentSettings = utils.getCurrentSettings(settings, serverSettings)
        data.host = currentSettings.host

        return data
      })
    }
  }

  plugin.route({
    method: 'GET',
    path: settings.endpoint,
    options: Hoek.applyToDefaults(pluginRouteConfig, {
      cors: settings.cors,
      tags: settings.routeTags,
      auth: settings.auth,
      validate: {
        query: Joi.object({
          tags: Joi.string().optional()
        }).options({
          stripUnknown: true
        })

      },
      handler: handler.resources,
      response: settings.responseValidation === true ? {
        schema: Schema.Swagger
      } : undefined
    })
  })

  // expose settings
  plugin.expose('settings', settings)
}
