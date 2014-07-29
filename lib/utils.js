var Hoek = require('hoek');
var utils = module.exports = {};

utils.isResourceRoute = function (routePath, resourceName) {
    return routePath && resourceName && routePath.search('^/' + resourceName + '(/|$)') === 0;
};

utils.getDescription = function (settings, prefix) {
    return Hoek.reach(settings, 'descriptions.' + prefix) || undefined;
};

utils.extractBasePath = function (settings, request) {
    var protocol = settings.protocol || request.server.info.protocol || 'http';
    var hostname = protocol + '://' + request.headers.host;
    var basePath = hostname + settings.pluginRoutePrefix + settings.endpoint + '/';
    return basePath;
};