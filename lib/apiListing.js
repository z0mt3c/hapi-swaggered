var utils = require('./utils');
var _ = require('lodash');

module.exports = function (settings) {
    return function (routingTable, tags, swaggerServerSettings) {
        routingTable = utils.filterRoutesByTags(settings, tags, routingTable);
        var apiPrefixes = utils.extractAPIKeys(routingTable);

        var apiList = _.map(apiPrefixes, function (apiKey) {
            var result = { path: apiKey };
            utils.setNotEmpty(result, 'description', utils.getDescription(swaggerServerSettings, apiKey) || utils.getDescription(settings, apiKey));
            return result;
        });

        return apiList;
    };
};