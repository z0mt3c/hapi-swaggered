var utils = require('./utils');
var _ = require('lodash');

module.exports = function(settings) {
    return function (routingTable, tags) {
        if (tags) {
            tags = tags.split(',');

            routingTable = _.filter(routingTable, function (route) {
                return !route.settings.tags || Hoek.intersect(route.settings.tags, tags).length > 0;
            });
        }

        var apiPrefixes = _.reduce(routingTable, function (memo, route) {
            var path = route.path;
            var indexOfFirstSlash = path.indexOf('/', 1);
            var prefix = indexOfFirstSlash !== -1 ? path.substring(1, indexOfFirstSlash) : path.substr(1);

            if (memo.indexOf(prefix) === -1) {
                memo.push(prefix);
            }

            return memo;
        }, []);

        var apiList = _.map(apiPrefixes, function (prefix) {
            return { path: prefix, description: utils.getDescription(settings, prefix) };
        });

        return apiList;
    };
};