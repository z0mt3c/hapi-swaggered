var _ = require('lodash');
var data = require('../test/specs-v2.0-examples/spec.json');
var utils = require('./utils');
var Hoek = require('hoek');
var generator = require('./generator');
var schema = require('./schema');
var Joi = require('joi');

var internals = {
    prepareParameters: function(definitions, scope, schema) {
        var swaggerProperties = generator.createProperties(schema, definitions);
        var paramsProperties = _.map(swaggerProperties, function(property, key) {
            property.name = key;
            property.in = scope;
            return property;
        });
        return paramsProperties;
    },
    prepareSchema: function(definitions, schema) {
        var swaggerSchema = generator.fromJoiSchema(schema, definitions);
        swaggerSchema = generator.extractAsDefinition(schema, definitions, swaggerSchema);
        swaggerSchema.in = 'body';

        if (swaggerSchema.$ref) {
            swaggerSchema.name = swaggerSchema.$ref;
            swaggerSchema.schema = {$ref: '#/definitions/' + swaggerSchema.$ref};
            delete swaggerSchema.$ref;
        } else {
            swaggerSchema.name = 'Payload';
        }

        return swaggerSchema;
    },
    prepareResponse: function(definitions, schema) {
        var swaggerSchema = generator.fromJoiSchema(schema, definitions);
        swaggerSchema.description = utils.getResponseDescription(schema);

        if (swaggerSchema.$ref) {
            swaggerSchema.schema = {$ref: '#/definitions/' + swaggerSchema.$ref};
            delete swaggerSchema.$ref;
        }

        delete swaggerSchema.required;
        return swaggerSchema;
    }
};

module.exports = function(settings, routes, tags) {
    routes = utils.filterRoutesByRequiredTags(routes, settings.requiredTags);

    if (settings.stripPrefix) {
        routes = utils.stripRoutesPrefix(routes, settings.stripPrefix);
    }

    var parsedTags = utils.parseTags(tags);

    if (parsedTags) {
        routes = utils.filterRoutesByTagSelection(routes, parsedTags.included, parsedTags.excluded);
    }

    routes = _.sortBy(routes, 'path');

    var routesByPath = utils.groupRoutesByPath(routes);
    var definitions = {};

    var paths = _.reduce(routesByPath, function(pathsMemo, routes, path) {
        var operations = _.reduce(routes, function(operationsMemo, route) {
            var parameters = [];
            var operationExtension = {};

            // Process request
            Hoek.assert(route.method, 'Really? No HTTP Method?');
            Hoek.assert(route.settings, 'Route settings missing');
            var routeSettings = route.settings;
            Hoek.assert(routeSettings.validate, 'Route settings incomplete (validate expected to be always present)');
            var defaultResponseSchema = Hoek.reach(routeSettings, 'response.schema');
            var statusResponseSchema = Hoek.reach(routeSettings, 'response.status');
            Hoek.assert(routeSettings.validate, 'Route settings incomplete (validate expected to be always present)');
            var validations = routeSettings.validate;
            Hoek.assert(routeSettings.plugins, 'Route settings incomplete (plugins expected to be always present)');

            var query = validations.query;
            var params = validations.params;
            var header = validations.headers;
            var payload = validations.payload;

            if (params) {
                var paramsProperties = internals.prepareParameters(definitions, 'path', params);
                parameters = parameters.concat(paramsProperties);
            }

            if (query) {
                var queryProperties = internals.prepareParameters(definitions, 'query', query);
                parameters = parameters.concat(queryProperties);
            }

            if (header) {
                var headerProperties = internals.prepareParameters(definitions, 'header', header);
                parameters = parameters.concat(headerProperties);
            }

            if (payload) {
                var allowedMimeType = Hoek.reach(routeSettings, 'payload.allow');

                if (Hoek.intersect(allowedMimeType, ['application/x-www-form-urlencoded', 'multipart/form-data']).length > 0) {
                    var formProperties = internals.prepareParameters(definitions, 'formData', payload);
                    parameters = parameters.concat(formProperties);
                    operationExtension.consumes = allowedMimeType;
                } else {
                    var payloadSchema = internals.prepareSchema(definitions, payload);
                    parameters = parameters.concat(payloadSchema);
                    operationExtension.consumes = settings.consumes;
                }

                utils.setNotEmpty(operationExtension, 'consumes', allowedMimeType);
            }

            // Process response
            var responses = { default: {} };

            var routesPluginOptions = routeSettings.plugins['hapi-swaggered'];
            Joi.assert(routesPluginOptions, schema.RoutesPluginOptions);

            var pluginResponses = (routesPluginOptions ? routesPluginOptions.responses : undefined) || {};
            responses = _.reduce(pluginResponses, function(memo, pluginResponseType, key) {
                var responseType = pluginResponseType.schema ? internals.prepareResponse(definitions, pluginResponseType.schema) : {};
                responseType.description = pluginResponseType.description;
                memo[key] = responseType;
                return memo;
            }, responses);

            var statusResponses = Hoek.merge({default: defaultResponseSchema}, statusResponseSchema);
            responses = _.reduce(statusResponses, function(memo, responseSchema, key) {
                if (!responseSchema) {
                    return memo;
                }

                var memoType = memo[key];
                var responseType = internals.prepareResponse(definitions, responseSchema);
                memo[key] = memoType ? Hoek.merge(memoType, responseType) : responseType;

                return memo;
            }, responses);

            operationExtension.responses = responses;
            operationExtension.produces = settings.produces;

            var baseOperation = {};
            var tags = routeSettings.tags;
            utils.setNotEmpty(baseOperation, 'tags', tags);
            utils.setNotEmpty(baseOperation, 'parameters', parameters);
            utils.setNotEmpty(baseOperation, 'summary', routeSettings.description);
            utils.setNotEmpty(baseOperation, 'notes', routeSettings.notes);

            if (_.contains(tags, 'deprecated')) {
                baseOperation.deprecated = true;
            }

            operationsMemo[route.method] = Hoek.merge(baseOperation, operationExtension);
            return operationsMemo;
        }, {});

        pathsMemo[path] = operations;
        return pathsMemo;
    }, {});

    return {
        paths: paths,
        definitions: definitions
    }
};
