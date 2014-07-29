var utils = require('./utils');
var _ = require('lodash');

module.exports = function (settings) {
    return function (routingTable, prefix) {
        routingTable = _.filter(routingTable, function (route) {
            return route.path.indexOf(prefix) === 1;
        });

        var routesPerPath = _.reduce(routingTable, function (memo, route) {
            var entry = memo[route.path] = memo[route.path] || [];
            entry.push(route);
            return memo;
        }, {});

        var apiDeclarations = _.map(routesPerPath, function (routes, path) {
            var operations = _.map(routes, function (route) {
                var parameters = [];

                return {
                    method: route.method.toUpperCase(),
                    summary: route.settings.description,
                    notes: route.settings.notes,
                    nickname: route.method + route.path.replace(/\//gi, '_').replace(/\{/gi, '_').replace(/\}/gi, '_'),
                    type: 'void',
                    parameters: parameters
                };
            });

            return {
                path: path,
                description: utils.getDescription(settings, prefix),
                operations: operations
            };
        });

        return apiDeclarations;
    };
};