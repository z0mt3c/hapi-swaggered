var Hoek = require('hoek');
var Joi = require('joi');
var Schema = require('./schema');
var _ = require('lodash');
var utils = require('./utils');
var Boom = require('boom');

var SWAGGER_VERSION = '1.2';
var defaultOptions = {
    requiredTags: ['api'],
    produces: ['application/json'],
    consumes: ['application/json'],
    // route configuration
    endpoint: '/swagger',
    routeTags: ['swagger'],
    responseValidation: true,
    endpointDeclarationSuffix: '/list',
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
        apiDeclaration: require('./apiDeclaration'),
        apiList: require('./apiListing'),
        keyGenerator: function(request) {
            var requestConnection = utils.getRequestConnection(request);
            return 'hapi-swaggered:' + requestConnection.info.uri + ':' + request.url.path;
        }
    };

    var methods = {
        resourceListing: function(request, reply) {
            var requestConnection = utils.getRequestConnection(request);
            var serverSettings = Hoek.reach(requestConnection, 'settings.app.swagger');
            var currentSettings = utils.getCurrentSettings(settings, serverSettings);
            var tags = request.query.tags;
            var apiRefs = internals.apiList(currentSettings, requestConnection.table(), tags, Hoek.reach(requestConnection, 'settings.app.swagger'));

            var basePath = utils.extractBaseHost(currentSettings, request);
            basePath += settings.pluginRoutePrefix + settings.endpoint + settings.endpointDeclarationSuffix;

            if (tags) {
                basePath += '?tags=' + encodeURIComponent(tags) + '&path=';
            } else {
                basePath += '?path=';
            }

            var resourceListingResponse = {
                swaggerVersion: SWAGGER_VERSION,
                basePath: basePath,
                apis: apiRefs
            };

            utils.setNotEmpty(resourceListingResponse, 'apiVersion', currentSettings.apiVersion);
            utils.setNotEmpty(resourceListingResponse, 'info', currentSettings.info);
            utils.setNotEmpty(resourceListingResponse, 'authorizations', currentSettings.authorizations);

            reply(null, resourceListingResponse);
        },
        apiDeclaration: function(request, reply) {
            var requestConnection = utils.getRequestConnection(request);
            var serverSettings = Hoek.reach(requestConnection, 'settings.app.swagger');
            var currentSettings = utils.getCurrentSettings(settings, serverSettings);

            var models = {};
            var path = request.query.path.substr(1);
            // request.server fallback for hapi < 8
            var apis = internals.apiDeclaration(currentSettings, requestConnection.table(), path, models, request.query.tags);

            if (_.isEmpty(apis)) {
                return reply(Boom.notFound());
            }

            var resourcePath = '/' + path;
            var basePath = utils.extractBaseHost(currentSettings, request);
            var stripPrefix = currentSettings.stripPrefix;

            if (stripPrefix) {
                basePath += stripPrefix;
            }

            var apiDeclaration = {
                swaggerVersion: SWAGGER_VERSION,
                basePath: basePath,
                resourcePath: resourcePath,
                produces: currentSettings.produces,
                apis: apis,
                models: models
            };

            utils.setNotEmpty(apiDeclaration, 'apiVersion', currentSettings.apiVersion);
            reply(null, apiDeclaration);
        }
    };

    var methodOptions = {
        cache: settings.cache,
        generateKey: internals.keyGenerator
    };

    plugin.method('resourceListing', methods.resourceListing, methodOptions);
    plugin.method('apiDeclaration', methods.apiDeclaration, methodOptions);

    var handler = {
        resourceListing: function(request, reply) {
            return plugin.methods.resourceListing(request, reply);
        },
        apiDeclaration: function(request, reply) {
            return plugin.methods.apiDeclaration(request, reply);
        }
    };

    plugin.route({
        method: 'GET',
        path: settings.endpoint,
        config: {
            tags: settings.routeTags,
            auth: settings.auth,
            validate: {
                query: {
                    tags: Joi.string().optional()
                }
            },
            handler: handler.resourceListing,
            response: settings.responseValidation === true ? {
                schema: Schema.ResourceListing
            } : undefined
        }
    });

    plugin.route({
        method: 'GET',
        path: settings.endpoint + settings.endpointDeclarationSuffix,
        config: {
            tags: settings.routeTags,
            auth: settings.auth,
            validate: {
                query: {
                    path: Joi.string().required(),
                    tags: Joi.string().optional()
                }
            },
            handler: handler.apiDeclaration,
            response: settings.responseValidation === true ? {
                schema: Schema.APIDeclaration
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
