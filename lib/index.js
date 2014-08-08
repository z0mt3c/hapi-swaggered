var Hoek = require('hoek');
var Joi = require('joi');
var Schema = require('./schema');
var _ = require('lodash');
var utils = require('./utils');

var SWAGGER_VERSION = '1.2';
var defaultOptions = {
    endpoint: '/swagger',
    requiredTags: ['api'],
    routeTags: ['swagger'],
    produces: [ 'application/json' ],
    consumes: [ 'application/json' ],
    cache: {
        expiresIn: 15 * 60 * 1000
    }
};

module.exports.register = function (plugin, options, next) {
    var Hapi = plugin.hapi;
    var settings = Hoek.applyToDefaults(defaultOptions, options);
    settings.pluginRoutePrefix = plugin.config.route.prefix || '';
    Hoek.assert(_.isArray(settings.requiredTags), 'required tags has to be an array');

    var internals = {
        apiDeclaration: require('./apiDeclaration'),
        apiList: require('./apiListing'),
        keyGenerator: function (request) {
            return 'hapi-swaggered:' + request.server.info.uri + ':' + request.url.path;
        }
    };

    var methods = {
        resourceListing: function (request, reply) {
            var serverSettings = Hoek.reach(request, 'server.settings.app.swagger');
            var currentSettings = utils.getCurrentSettings(settings, serverSettings);

            var apiRefs = internals.apiList(currentSettings, request.server.table(), request.query.tags, Hoek.reach(request, 'server.settings.app.swagger'));

            var resourceListingResponse = {
                swaggerVersion: SWAGGER_VERSION,
                apis: apiRefs
            };

            utils.setNotEmpty(resourceListingResponse, 'apiVersion', currentSettings.apiVersion);
            utils.setNotEmpty(resourceListingResponse, 'info', currentSettings.info);
            utils.setNotEmpty(resourceListingResponse, 'authorizations', currentSettings.authorizations);

            reply(null, resourceListingResponse);
        },
        apiDeclaration: function (request, reply) {
            var serverSettings = Hoek.reach(request, 'server.settings.app.swagger');
            var currentSettings = utils.getCurrentSettings(settings, serverSettings);

            var models = {};

            var apis = internals.apiDeclaration(currentSettings, request.server.table(), request.params.path, models, request.query.tags);

            if (_.isEmpty(apis)) {
                return reply(Hapi.error.notFound());
            }

            var resourcePath = '/' + request.params.path;
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
        resourceListing: function (request, reply) {
            return plugin.methods.resourceListing(request, reply);
        },
        apiDeclaration: function (request, reply) {
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
            response: {
                schema: Schema.ResourceListing
            }
        }
    });

    plugin.route({
        method: 'GET',
        path: settings.endpoint + '/{path}',
        config: {
            tags: settings.routeTags,
            auth: settings.auth,
            validate: {
                params: {
                    path: Joi.string().required()
                },
                query: {
                    tags: Joi.string().optional()
                }
            },
            handler: handler.apiDeclaration,
            response: {
                schema: Schema.APIDeclaration
            }
        }
    });

    // expose settings
    plugin.expose('settings', settings);

    if (settings.info) {
        Joi.validate(settings.info, Schema.Info, function (err) {
            Hoek.assert(!err, 'Swagger info object invalid: ' + err);
            return next();
        });
    } else {
        next();
    }
};

module.exports.register.attributes = {
    pkg: require('../package.json')
};