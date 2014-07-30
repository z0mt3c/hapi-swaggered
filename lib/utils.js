var Hoek = require('hoek');
var _ = require('lodash');
var utils = module.exports = {};

utils.isResourceRoute = function (routePath, resourceName) {
    return routePath && resourceName && routePath.search('^/' + resourceName + '(/|$)') === 0;
};

utils.getDescription = function (settings, prefix) {
    return Hoek.reach(settings, 'descriptions.' + prefix) || undefined;
};


utils.extractBaseHost = function (settings, request) {
    var protocol = settings.protocol || request.server.info.protocol || 'http';
    var hostname = protocol + '://' + request.headers.host;
    return hostname;
};

utils.extractBasePath = function (settings, request) {
    var basePath = utils.extractBaseHost(settings, request) + settings.pluginRoutePrefix + settings.endpoint + '/';
    return basePath;
};

utils.generateNameFromSchema = function (schema) {
    var children = Hoek.reach(schema, '_inner.children');
    var keys = _.map(_.pluck(children, 'key'), function(key) {
        return key.charAt(0).toUpperCase() + key.slice(1);
    });
    keys.push('Model');
    return keys.join('');
};