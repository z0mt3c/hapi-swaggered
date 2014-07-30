var utils = require('./utils');
var _ = require('lodash');

module.exports = function (settings) {
    return function (routingTable, tags) {
        routingTable = utils.filterRoutesByTags(settings, tags, routingTable);
        var apiPrefixes = utils.extractAPIKeys(routingTable);

        var apiList = _.map(apiPrefixes, function (prefix) {
            return { path: prefix, description: utils.getDescription(settings, prefix) };
        });

        return apiList;
    };
};