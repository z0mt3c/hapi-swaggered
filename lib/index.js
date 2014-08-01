var Hoek = require('hoek');
var Joi = require('joi');
var Path = require('path');
var Schema = require('./schema');
var _ = require('lodash');
var utils = require('./utils');

var SWAGGER_VERSION = '1.2';
var defaultOptions = {
    endpoint: '/swagger',
    requiredTag: 'api',
    routeTags: ['swagger'],
    produces: [ 'application/json' ]
};

module.exports.register = function (plugin, options, next) {
    var Hapi = plugin.hapi;
    var settings = Hoek.applyToDefaults(defaultOptions, options || {});
    settings.pluginRoutePrefix = plugin.config.route.prefix || '';

    var internals = {
        apiDeclaration: require('./apiDeclaration')(settings),
        apiList: require('./apiListing')(settings)
    };

    var handler = {};

    handler.resourceListing = function (request, reply) {
        var apiRefs = internals.apiList(request.server.table(), request.query.tags, Hoek.reach(request, 'server.settings.app.swagger'));

        var resourceListingResponse = {
            swaggerVersion: SWAGGER_VERSION,
            apis: apiRefs
        };

        utils.setNotEmpty(resourceListingResponse, 'apiVersion', settings.apiVersion);
        utils.setNotEmpty(resourceListingResponse, 'info', Hoek.reach(request, 'server.settings.app.swagger.info') || settings.info);
        utils.setNotEmpty(resourceListingResponse, 'authorizations', Hoek.reach(request, 'server.settings.app.swagger.authorizations') || settings.authorizations);

        reply(resourceListingResponse);
    };

    handler.apiDeclaration = function (request, reply) {
        var models = {};
        var apis = internals.apiDeclaration(request.server.table(), request.params.path, models, request.query.tags, Hoek.reach(request, 'server.settings.app.swagger'));

        if (_.isEmpty(apis)) {
            return reply(Hapi.error.notFound());
        }

        var apiDeclaration = {
            swaggerVersion: SWAGGER_VERSION,
            basePath: utils.extractBaseHost(settings, request),
            resourcePath: '/' + request.params.path,
            produces: settings.produces,
            apis: apis,
            models: models
        };


        utils.setNotEmpty(apiDeclaration, 'apiVersion', settings.apiVersion);

        reply(apiDeclaration);
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