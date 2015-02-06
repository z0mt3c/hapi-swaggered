var Hoek = require('hoek');
var Joi = require('joi');
var Schema = require('./schema');
var _ = require('lodash');
var utils = require('./utils');
var Boom = require('boom');

var SWAGGER_VERSION = '2.0';
var defaultOptions = {
    requiredTags: ['api'],
    produces: ['application/json'],
    consumes: ['application/json'],
    endpoint: '/swagger',
    routeTags: ['swagger'],
    responseValidation: true,
    cache: {
        expiresIn: 15 * 60 * 1000
    }
};

module.exports.register = function(plugin, options, next) {
    var settings = Hoek.applyToDefaults(defaultOptions, options);
    Joi.assert(options, Schema.PluginOptions);
    var routeConfig = utils.getRoutesModifiers(plugin);
    settings.pluginRoutePrefix = routeConfig.route.prefix || '';

    var internals = {
        resources: require('./resources'),
        keyGenerator: function(request) {
            var requestConnection = utils.getRequestConnection(request);
            return 'hapi-swaggered:' + requestConnection.info.uri + ':' + request.url.path;
        }
    };

    var methods = {
        resources: function(request, reply) {
            var requestConnection = utils.getRequestConnection(request);
            var serverSettings = Hoek.reach(requestConnection, 'settings.app.swagger');
            var currentSettings = utils.getCurrentSettings(settings, serverSettings);
            var resources = internals.resources(currentSettings, requestConnection.table(), request.query.tags);

            var data = {
                swagger: SWAGGER_VERSION,
                schemes: currentSettings.schemes,
                externalDocs: currentSettings.externalDocs,
                paths: resources.paths,
                definitions: resources.definitions
            };

            utils.setNotEmpty(data, 'host', currentSettings.host);
            utils.setNotEmpty(data, 'info', currentSettings.info);
            utils.setNotEmpty(data, 'basePath', settings.stripPrefix);

            reply(null, data);
        }
    };

    var resourcesGenerator = methods.resources;

    if (settings.cache !== false) {
        plugin.method('resources', resourcesGenerator, {
            cache: settings.cache,
            generateKey: internals.keyGenerator
        });

        resourcesGenerator = plugin.methods.resources;
    }

    var handler = {
        resources: function(request, reply) {
            return resourcesGenerator(request, function(error, data) {
                if (error) {
                    return reply(Boom.badImplementation(error));
                }

                var requestConnection = utils.getRequestConnection(request);
                var serverSettings = Hoek.reach(requestConnection, 'settings.app.swagger');
                var currentSettings = utils.getCurrentSettings(settings, serverSettings);
                data.host = currentSettings.host;

                return reply(data);
            });
        }
    };

    plugin.route({
        method: 'GET',
        path: settings.endpoint,
        config: {
            tags: settings.routeTags,
            auth: settings.auth,
            validate: {
                query: Joi.object({
                    tags: Joi.string().optional()
                }).options({
                    stripUnknown : true
                })

            },
            handler: handler.resources,
            response: settings.responseValidation === true ? {
                schema: Schema.Swagger
            } : undefined
        }
    });

    // expose settings
    plugin.expose('settings', settings);

    next();
};

module.exports.register.attributes = {
    pkg: require('../package.json')
};
