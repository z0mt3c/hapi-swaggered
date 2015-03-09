var Hoek = require('hoek');
var _ = require('lodash');
var utils = module.exports = {};

utils.getRequestConnection = function(request) {
    // request.server fallback for hapi < 8
    return request.connection || request.server;
};

utils.getRoutesModifiers = function(plugin) {
    // plugin.config fallback for hapi < 8
    return plugin.config || Hoek.reach(plugin, 'realm.modifiers');
};

utils.getDescription = function(settings, apiKey) {
    if (!apiKey) {
        return undefined;
    } else if (apiKey.charAt(0) === '/') {
        apiKey = apiKey.substr(1);
    }

    return Hoek.reach(settings, 'descriptions.' + apiKey) || undefined;
};

utils.firstCharToUpperCase = function(string) {
    if (!string || string.length === 0) {
        return string;
    } else {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
};

utils.generateNameFromSchema = function(schema) {
    var isArray = schema && schema._type === 'array';
    var keys = [];

    if (isArray) {
        return 'Array';
    } else {
        var children = Hoek.reach(schema, '_inner.children');
        keys = _.map(_.pluck(children, 'key'), utils.firstCharToUpperCase);
    }

    if (_.isEmpty(keys)) {
        return 'EmptyModel';
    } else {
        keys.push('Model');
        return keys.join('');
    }
};


utils.parseTags = function(tags) {
    if (_.isEmpty(tags)) {
        return null;
    }

    var tagsList = _.isArray(tags) ? tags : tags.split(',');
    var included = [];
    var excluded = [];

    _.each(tagsList, function(tag) {
        tag = tag.trim();
        var firstChar = tag.trim().charAt(0);

        if (firstChar === '+') {
            included.push(tag.substr(1));
        } else if (firstChar === '-') {
            excluded.push(tag.substr(1));
        } else {
            included.push(tag);
        }
    });

    return {
        included: included,
        excluded: excluded
    };
};

utils.filterRoutesByRequiredTags = function(routingTable, requiredTags) {
    if (_.isEmpty(requiredTags)) {
        return routingTable;
    }

    return _.filter(routingTable, function(route) {
        var routeTags = route.settings ? route.settings.tags : null;
        return Hoek.intersect(routeTags, requiredTags).length === requiredTags.length;
    });
};

utils.filterRoutesByTagSelection = function(routingTable, includedTags, excludedTags) {
    return _.filter(routingTable, function(route) {
        var routeTags = route.settings ? route.settings.tags : null;

        if (Hoek.intersect(routeTags, excludedTags).length > 0) {
            return false;
        } else if (!includedTags || includedTags.length === 0 || Hoek.intersect(routeTags, includedTags).length > 0) {
            return true;
        } else {
            return false;
        }
    });
};

utils.getCurrentSettings = function(settings, serverSettings) {
    if (!serverSettings) {
        return settings;
    } else {
        return Hoek.applyToDefaults(settings, serverSettings);
    }
};

utils.stripRoutesPrefix = function(routingTable, stripPrefix) {
    if (!stripPrefix) {
        return routingTable;
    }

    var stripPrefixLength = stripPrefix.length;

    return _.reduce(routingTable, function(memo, route) {
        if (route.path.indexOf(stripPrefix) === 0) {
            var routeClone = _.clone(route);
            if (route.path.length > stripPrefixLength) {
                routeClone.path = route.path.substr(stripPrefixLength);
                memo.push(routeClone);
            }
        }
        return memo;
    }, []);
};

utils.filterRoutesByPrefix = function(routingTable, prefix) {
    var prefixLength = prefix.length;
    return _.filter(routingTable, function(route) {
        var routePath = route.path;
        var startsWithPrefix = routePath.indexOf(prefix) === 1;

        if (startsWithPrefix) {
            return (routePath.length === prefixLength + 1 || routePath.charAt(prefixLength + 1) === '/');
        } else {
            return false;
        }
        // return routePath && prefix && routePath.search('^/' + prefix + '(/|$)') === 0;
    });
};

utils.groupRoutesByPath = function(routingTable) {
    var routesPerPath = _.reduce(routingTable, function(memo, route) {
        var entry = memo[route.path] = memo[route.path] || [];
        entry.push(route);
        return memo;
    }, {});
    return routesPerPath;
};

utils.extractAPIKeys = function(routingTable) {
    var apiPrefixes = _.reduce(routingTable, function(memo, route) {
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

utils.generateFallbackName = function(modelName) {
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
    return route.method + route.path.replace(/[\/|\{|}]/gi, '_');
};

utils.getSetting = function(schema, key) {
    if (schema && schema._settings && schema._settings[key]) {
        return schema._settings[key];
    }

    return undefined;
};

utils.getMeta = function(schema, key) {
    // merge meta objects - last one wins
    var meta = schema ? _.extend.apply(null, schema._meta) : undefined;
    // Still fallback to settings for joi <6
    return meta && !_.isUndefined(meta[key]) ? meta[key] : utils.getSetting(schema, key);
};

utils.generateName = function(schema) {
    return utils.getMeta(schema, 'className') || utils.generateNameFromSchema(schema);
};

utils.generateNameWithFallback = function(schema, definitions, definition) {
    var definitionName = utils.generateName(schema);

    if (definition && definitions) {
        while (definitions[definitionName] && !_.isEqual(definitions[definitionName], definition)) {
            definitionName = utils.generateFallbackName(definitionName);
        }
    }

    return definitionName;
};

utils.getSchemaDescription = function(schema) {
    return schema._description || undefined;
};

utils.getResponseDescription = function(schema) {
    return utils.getMeta(schema, 'description') || utils.getSchemaDescription(schema) || undefined;
};

utils.getPrimitiveType = function(schema) {
    return _.find(schema._tests, {name: 'integer'}) ? 'integer' : schema._type
};

utils.findSchemaTest = function(schema, name) {
    var max = _.find(schema._tests, {
        name: name
    });

    return max ? max.arg : undefined;
};

utils.parseBaseModelAttributes = function(schema) {
    var required = Hoek.reach(schema, '_flags.presence') === 'required';
    var description = schema._description;
    var defaultValue = Hoek.reach(schema, '_flags.default');
    var format = utils.getMeta(schema, 'format');
    var enumValues = Hoek.reach(schema, '_flags.allowOnly') === true ? Hoek.reach(schema, '_valids._set') : undefined;
    enumValues = _.isArray(enumValues) && enumValues.length > 0 ? enumValues : undefined;

    var schemaType = utils.getPrimitiveType(schema);
    var swaggerType = utils.getMeta(schema, 'swaggerType') || schemaType;

    var baseModel = {
        required: required
    };

    utils.setNotEmpty(baseModel, 'description', description);

    // TODO: Following working? Not covered by tests!
    utils.setNotEmpty(baseModel, 'default', defaultValue);
    utils.setNotEmpty(baseModel, 'format', format);
    utils.setNotEmpty(baseModel, 'enum', enumValues);
    utils.setNotEmpty(baseModel, 'minimum', utils.findSchemaTest(schema, 'min'));
    utils.setNotEmpty(baseModel, 'maximum', utils.findSchemaTest(schema, 'max'));

    return baseModel;
};


utils.getFirstInclusionType = function(schema) {
    var inclusionTypes = Hoek.reach(schema, '_inner.inclusions');
    return _.first(inclusionTypes);
};