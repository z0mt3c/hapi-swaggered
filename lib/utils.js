var Hoek = require('hoek');
var _ = require('lodash');
var utils = module.exports = {};
var path = require('path');

utils.getDescription = function (settings, apiKey) {
    if (!apiKey) {
        return undefined;
    } else if (apiKey.charAt(0) === '/') {
        apiKey = apiKey.substr(1);
    }

    return Hoek.reach(settings, 'descriptions.' + apiKey) || undefined;
};

utils.extractBaseHost = function (settings, request) {
    var protocol = settings.protocol || Hoek.reach(request, 'server.info.protocol') || 'http';
    var hostname = protocol + '://' + (settings.host || request.headers.host || 'localhost');
    return hostname;
};

utils.generateNameFromSchema = function (schema) {
    var children = Hoek.reach(schema, '_inner.children');
    var keys = _.map(_.pluck(children, 'key'), function (key) {
        return key.charAt(0).toUpperCase() + key.slice(1);
    });

    if (_.isEmpty(keys)) {
        return 'EmptyModel';
    } else {
        keys.push('Model');
        return keys.join('');
    }
};

utils.filterRoutesByTags = function (settings, tags, routingTable) {
    var requiredTag = (settings && settings.requiredTag);

    if (tags || requiredTag) {
        var split = _.isArray(tags) ? tags : [];

        if (_.isString(tags)) {
            split = tags.split(',');
        }

        tags = _.union(split);

        routingTable = _.filter(routingTable, function (route) {
            var routeTags = route.settings ? route.settings.tags : null;

            if (_.isUndefined(routeTags) || _.isEmpty(routeTags)) {
                return false;
            } else if (requiredTag && !_.contains(routeTags, settings.requiredTag)) {
                return false;
            } else {
                return tags.length == 0 || Hoek.intersect(routeTags, tags).length > 0;
            }
        });
    }

    return routingTable;
};

utils.filterRoutesByPrefix = function (routingTable, prefix) {
    var prefixLength = prefix.length;
    return _.filter(routingTable, function (route) {
        var routePath = route.path;
        var startsWithPrefix = routePath.indexOf(prefix) === 1;

        if (startsWithPrefix) {
            return (routePath.length === prefixLength + 1 || routePath.charAt(prefixLength + 1) === '/')
        } else {
            return false;
        }
        // return routePath && prefix && routePath.search('^/' + prefix + '(/|$)') === 0;
    });
};

utils.groupRoutesByPath = function (routingTable) {
    var routesPerPath = _.reduce(routingTable, function (memo, route) {
        var entry = memo[route.path] = memo[route.path] || [];
        entry.push(route);
        return memo;
    }, {});
    return routesPerPath;
};

utils.extractAPIKeys = function (routingTable) {
    var apiPrefixes = _.reduce(routingTable, function (memo, route) {
        var path = route.path;

        if (path !== '/') {
            var indexOfFirstSlash = path.indexOf('/', 1);
            var prefix = indexOfFirstSlash !== -1 ? path.substring(0, indexOfFirstSlash) : path.substr(0);

            if (memo.indexOf(prefix) === -1) {
                memo.push(prefix);
            }
        }

        return memo;
    }, []);

    apiPrefixes.sort();

    return apiPrefixes;
};


var numberSuffix = /_([0-9]+)$/;

utils.generateFallbackName = function (modelName) {
    if (_.isEmpty(modelName)) {
        return null;
    }

    var match = numberSuffix.exec(modelName);

    if (match) {
        var count = parseInt(match[1], 10) + 1;
        modelName = modelName.replace(numberSuffix, '_' + count);
    } else {
        modelName = modelName + '_' + 2;
    }

    return modelName;
};

var primitiveSwaggerTypes = ['integer', 'number', 'string', 'boolean', 'string'];

utils.isPrimitiveSwaggerType = function(type) {
    return _.contains(primitiveSwaggerTypes, type);
};

utils.setNotEmpty = function(target, key, value) {
    if (!_.isEmpty(value) || _.isNumber(value)) {
        target[key] = value;
    }

    return target;
};

utils.generateRouteNickname = function(route) {
    return route.method + route.path.replace(/\//gi, '_').replace(/\{/gi, '_').replace(/\}/gi, '_');
};