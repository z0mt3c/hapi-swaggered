var utils = require('./utils');
var _ = require('lodash');
var Hoek = require('hoek');
var generator = require('./generator');

module.exports = function (settings) {
    return function (routingTable, apiKey, models, tags, swaggerServerSettings) {
        Hoek.assert(apiKey, 'apiKey not allowed to be null nor empty');

        routingTable = utils.filterRoutesByTags(settings, tags, routingTable);
        routingTable = utils.filterRoutesByPrefix(routingTable, apiKey);
        routingTable = _.sortBy(routingTable, 'path');

        var routesPerPath = utils.groupRoutesByPath(routingTable);

        var apiDeclarations = _.map(routesPerPath, function (routes, path) {
            var operations = _.map(routes, function (route) {
                var parameters = [];
                var responseTypeExtension = { type: 'void' };
                var response = Hoek.reach(route, 'settings.response.schema');
                var query = Hoek.reach(route, 'settings.validate.query');
                var params = Hoek.reach(route, 'settings.validate.params');
                var payload = Hoek.reach(route, 'settings.validate.payload');

                if (params) {
                    var paramsSwagger = generator.createProperties(params, null, models);
                    var paramsProperties = _.map(paramsSwagger, function(property, key) {
                        property.name = key;
                        property.paramType = 'path';
                        return property;
                    });

                    parameters = parameters.concat(paramsProperties);
                }

                if (query) {
                    var querySwagger = generator.createProperties(query, null, models);
                    var queryProperties = _.map(querySwagger, function(property, key) {
                        property.name = key;
                        property.paramType = 'query';
                        return property;
                    });

                    parameters = parameters.concat(queryProperties);
                }

                if (payload) {
                    var payloadSwagger = generator.fromJoiSchema(payload, null, models);
                    payloadSwagger.name = 'body';
                    payloadSwagger.paramType = 'body';
                    parameters = parameters.concat(payloadSwagger);
                }

                if (response) {
                    var responseSwagger = generator.fromJoiSchema(response, null, models);
                    responseTypeExtension.type = responseSwagger.type || responseTypeExtension.type;
                    responseTypeExtension.items = responseSwagger.items || undefined;
                }

                Hoek.assert(route.method, 'Really? No HTTP Method?');

                var baseResponse = {
                    method: route.method.toUpperCase(),
                    nickname: utils.generateRouteNickname(route),
                    parameters: parameters
                };

                utils.setNotEmpty(baseResponse, 'summary', Hoek.reach(route, 'settings.description'));
                utils.setNotEmpty(baseResponse, 'notes', Hoek.reach(route, 'settings.notes'));

                return Hoek.merge(baseResponse, responseTypeExtension);
            });

            operations = _.sortBy(operations, 'method');

            var result = {
                path: path,
                operations: operations
            };

            //TODO: didn't see it in ui? is it real?
            utils.setNotEmpty(result, 'description', utils.getDescription(swaggerServerSettings, apiKey) || utils.getDescription(settings, apiKey));

            return result;
        });

        return apiDeclarations;
    };
};