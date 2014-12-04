var utils = require('./utils');
var _ = require('lodash');

module.exports = function(settings, routingTable, tags) {
    routingTable = utils.filterRoutesByRequiredTags(routingTable, settings.requiredTags);

    var parsedTags = utils.parseTags(tags);
    if (parsedTags) {
        routingTable = utils.filterRoutesByTagSelection(routingTable, parsedTags.included, parsedTags.excluded);
    }

    if (settings.stripPrefix) {
        routingTable = utils.stripRoutesPrefix(routingTable, settings.stripPrefix);
    }

    var apiPrefixes = utils.extractAPIKeys(routingTable);
    var apiList = _.map(apiPrefixes, function(apiKey) {
        var result = {path: apiKey};
        utils.setNotEmpty(result, 'description', utils.getDescription(settings, apiKey));
        return result;
    });

    return apiList;
};