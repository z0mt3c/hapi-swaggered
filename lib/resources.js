var _ = require('lodash');
var data = require('../test/specs-v2.0-examples/spec.json');
var utils = require('./utils');
var Hoek = require('hoek');
var generator = require('./generator');

var internals = {
    prepareParameters: function(definitions, scope, params) {
        var paramsSwagger = generator.createProperties(params, definitions);
        var paramsProperties = _.map(paramsSwagger, function(property, key) {
            property.name = key;
            property.in = scope;
            return property;
        });
        return paramsProperties;
    },
    prepareSchema: function(definitions, payload) {
        var payloadSwagger = generator.fromJoiSchema(payload, definitions);
        payloadSwagger.name = payloadSwagger.$ref;
        payloadSwagger.in = 'body';
        payloadSwagger.schema = {$ref: '#/definitions/' + payloadSwagger.$ref};
        delete payloadSwagger.$ref;
        return payloadSwagger;
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
            Hoek.assert(route.method, 'Really? No HTTP Method?');

            var parameters = [];
            var responseTypeExtension = {
                responses: {
                    default: {}
                }
            };

            var response = Hoek.reach(route, 'settings.response.schema');
            var validations = Hoek.reach(route, 'settings.validate') || {};
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
                var allowedMimeType = Hoek.reach(route, 'settings.payload.allow');
                if (_.contains(allowedMimeType, 'application/x-www-form-urlencoded') || _.contains(allowedMimeType, 'multipart/form-data')) {
                    // deal with form payloads
                    var formProperties = internals.prepareParameters(definitions, 'formData', payload);
                    parameters = parameters.concat(formProperties);
                    responseTypeExtension.consumes = allowedMimeType;
                } else {
                    var payloadSchema = internals.prepareSchema(definitions, payload);
                    parameters = parameters.concat(payloadSchema);
                    responseTypeExtension.consumes = settings.consumes;
                }

                utils.setNotEmpty(responseTypeExtension, 'consumes', allowedMimeType);
            }

            if (response) {
                var responseSwagger = generator.fromJoiSchema(response, definitions);
                utils.setNotEmpty(responseTypeExtension, 'type', responseSwagger.type);
                utils.setNotEmpty(responseTypeExtension, 'items', responseSwagger.items);
                responseTypeExtension.produces = settings.produces;
            }

            var baseOperation = {
                //nickname: utils.generateRouteNickname(route),
            };

            var tags = Hoek.reach(route, 'settings.tags');
            utils.setNotEmpty(baseOperation, 'tags', tags);
            utils.setNotEmpty(baseOperation, 'parameters', parameters);
            utils.setNotEmpty(baseOperation, 'summary', Hoek.reach(route, 'settings.description'));
            utils.setNotEmpty(baseOperation, 'notes', Hoek.reach(route, 'settings.notes'));

            if (_.contains(tags, 'deprecated')) {
                baseOperation.deprecated = true;
            }

            operationsMemo[route.method] = Hoek.merge(baseOperation, responseTypeExtension);
            return operationsMemo;
        }, {});

        if (!_.isEmpty(operations)) {
            pathsMemo[path] = operations;
        }

        return pathsMemo;
    }, {});

    return {
        paths: paths,
        definitions: definitions
    }
};
