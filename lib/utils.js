var Hoek = require('hoek')
var _ = require('lodash')
var utils = module.exports = {}

utils.getRequestConnection = function (request) {
  // request.server fallback for hapi < 8
  return request.connection || request.server
}

utils.getRoutesModifiers = function (plugin) {
  // plugin.config fallback for hapi < 8
  return plugin.config || Hoek.reach(plugin, 'realm.modifiers')
}

utils.firstCharToUpperCase = function (string) {
  if (!string || string.length === 0) {
    return string
  } else {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
}

utils.generateNameFromSchema = function (schema) {
  var isArray = schema && schema._type === 'array'
  var isPrimitive = schema && utils.isPrimitiveSwaggerType(schema._type)
  var keys = []

  if (isPrimitive) {
    return utils.firstCharToUpperCase(utils.getPrimitiveType(schema))
  } else if (isArray) {
    return 'Array'
  } else {
    var children = Hoek.reach(schema, '_inner.children')
    keys = _.map(_.pluck(children, 'key'), utils.firstCharToUpperCase)
  }

  if (_.isEmpty(keys)) {
    return 'EmptyModel'
  } else {
    keys.push('Model')
    return keys.join('')
  }
}

utils.parseTags = function (tags) {
  if (_.isEmpty(tags)) {
    return null
  }

  var tagsList = _.isArray(tags) ? tags : tags.split(',')
  var included = []
  var excluded = []

  _.each(tagsList, function (tag) {
    tag = tag.trim()
    var firstChar = tag.trim().charAt(0)

    if (firstChar === '+') {
      included.push(tag.substr(1))
    } else if (firstChar === '-') {
      excluded.push(tag.substr(1))
    } else {
      included.push(tag)
    }
  })

  return {
    included: included,
    excluded: excluded
  }
}

utils.filterRoutesByRequiredTags = function (routingTable, requiredTags) {
  if (_.isEmpty(requiredTags)) {
    return routingTable
  }

  return _.filter(routingTable, function (route) {
    var routeTags = route.settings ? route.settings.tags : null
    return Hoek.intersect(routeTags, requiredTags).length === requiredTags.length
  })
}

utils.filterRoutesByTagSelection = function (routingTable, includedTags, excludedTags) {
  return _.filter(routingTable, function (route) {
    var routeTags = route.settings ? route.settings.tags : null

    if (Hoek.intersect(routeTags, excludedTags).length > 0) {
      return false
    } else if (!includedTags || includedTags.length === 0 || Hoek.intersect(routeTags, includedTags).length > 0) {
      return true
    } else {
      return false
    }
  })
}

utils.getCurrentSettings = function (settings, serverSettings) {
  if (serverSettings == null) {
    return settings
  } else {
    var currentSettings = Hoek.applyToDefaults(settings, serverSettings)
    currentSettings.tags = _.union(utils.getTags(settings), utils.getTags(serverSettings))
    return currentSettings
  }
}

utils.stripRoutesPrefix = function (routingTable, stripPrefix) {
  if (!stripPrefix) {
    return routingTable
  }

  var stripPrefixLength = stripPrefix.length

  return _.reduce(routingTable, function (memo, route) {
    if (route.path.indexOf(stripPrefix) === 0) {
      var routeClone = _.clone(route)
      if (route.path.length > stripPrefixLength) {
        routeClone.path = route.path.substr(stripPrefixLength)
        memo.push(routeClone)
      }
    }
    return memo
  }, [])
}

utils.filterRoutesByPrefix = function (routingTable, prefix) {
  var prefixLength = prefix.length
  return _.filter(routingTable, function (route) {
    var routePath = route.path
    var startsWithPrefix = routePath.indexOf(prefix) === 1

    if (startsWithPrefix) {
      return (routePath.length === prefixLength + 1 || routePath.charAt(prefixLength + 1) === '/')
    } else {
      return false
    }
  // return routePath && prefix && routePath.search('^/' + prefix + '(/|$)') === 0
  })
}

utils.sanitizePath = function (path) {
  return path.replace(/(\*[0-9]*|\?)}/g, '}')
}

utils.groupRoutesByPath = function (routingTable) {
  var routesPerPath = _.reduce(routingTable, function (memo, route) {
    var path = utils.sanitizePath(route.path)
    var entry = memo[path] = memo[path] || []
    entry.push(route)
    return memo
  }, {})
  return routesPerPath
}

utils.extractAPIKeys = function (routingTable) {
  var apiPrefixes = _.reduce(routingTable, function (memo, route) {
    var path = route.path

    if (path !== '/') {
      var indexOfFirstSlash = path.indexOf('/', 1)
      var prefix = indexOfFirstSlash !== -1 ? path.substring(0, indexOfFirstSlash) : path.substr(0)

      if (memo.indexOf(prefix) === -1) {
        memo.push(prefix)
      }
    }

    return memo
  }, [])

  apiPrefixes.sort()

  return apiPrefixes
}

var numberSuffix = /_([0-9]+)$/

utils.generateFallbackName = function (modelName) {
  if (_.isEmpty(modelName)) {
    return null
  }

  var match = numberSuffix.exec(modelName)

  if (match) {
    var count = parseInt(match[1], 10) + 1
    modelName = modelName.replace(numberSuffix, '_' + count)
  } else {
    modelName = modelName + '_' + 2
  }

  return modelName
}

var primitiveSwaggerTypes = ['integer', 'number', 'string', 'boolean', 'string', 'date']
var supportedTypes = primitiveSwaggerTypes.concat('object', 'array')

utils.isPrimitiveSwaggerType = function (type) {
  return _.contains(primitiveSwaggerTypes, type)
}

utils.getMetaSwaggerType = function (schema) {
  return utils.getMeta(schema, 'swaggerType')
}

utils.isSupportedSchema = function (schema) {
  return schema != null && Hoek.reach(schema, '_flags.func') !== true && schema.isJoi === true && (utils.isSupportedType(utils.getPrimitiveType(schema)) || utils.getMetaSwaggerType(schema) != null)
}

utils.isSupportedType = function (type) {
  return type != null && _.contains(supportedTypes, type)
}

utils.setNotEmpty = function (target, key, value) {
  if (!_.isEmpty(value) || _.isNumber(value)) {
    target[key] = value
  }

  return target
}

utils.generateRouteNickname = function (route) {
  return route.method + route.path.replace(/[\/|\{|}]/gi, '_')
}

utils.getSetting = function (schema, key) {
  if (schema && schema._settings && schema._settings[key]) {
    return schema._settings[key]
  }

  return undefined
}

utils.getMeta = function (schema, key) {
  // merge meta objects - last one wins
  var meta = schema ? _.extend.apply(null, schema._meta) : undefined
  // Still fallback to settings for joi <6
  return meta && !_.isUndefined(meta[key]) ? meta[key] : utils.getSetting(schema, key)
}

utils.generateName = function (schema) {
  return utils.getMeta(schema, 'className') || utils.generateNameFromSchema(schema)
}

utils.generateNameWithFallback = function (schema, definitions, definition) {
  var definitionName = utils.generateName(schema)

  if (definition && definitions) {
    while (definitions[definitionName] && !_.isEqual(definitions[definitionName], definition)) {
      definitionName = utils.generateFallbackName(definitionName)
    }
  }

  return definitionName
}

utils.getSchemaDescription = function (schema) {
  return schema._description || undefined
}

utils.getResponseDescription = function (schema) {
  return utils.getMeta(schema, 'description') || utils.getSchemaDescription(schema) || undefined
}

utils.getPrimitiveType = function (schema) {
  var swaggerType = utils.getMetaSwaggerType(schema)

  if (swaggerType != null) {
    return swaggerType
  }

  var isInteger = _.find(schema._tests, {name: 'integer'}) != null
  return isInteger ? 'integer' : schema._type
}

utils.findSchemaTest = function (schema, name) {
  var max = _.find(schema._tests, {
    name: name
  })

  return max ? max.arg : undefined
}

utils.parseBaseModelAttributes = function (schema) {
  var required = Hoek.reach(schema, '_flags.presence') === 'required'
  var description = schema._description
  var defaultValue = Hoek.reach(schema, '_flags.default')
  var format = utils.getFormat(schema)
  var enumValues = Hoek.reach(schema, '_flags.allowOnly') === true ? Hoek.reach(schema, '_valids._set') : undefined
  var collectionFormat = utils.getMeta(schema, 'collectionFormat')

  var baseModel = {
    required: required
  }

  utils.setNotEmpty(baseModel, 'description', description)

  // TODO: Following working? Not covered by tests!
  utils.setNotEmpty(baseModel, 'default', defaultValue)
  utils.setNotEmpty(baseModel, 'format', format)
  utils.setNotEmpty(baseModel, 'enum', enumValues)
  utils.setNotEmpty(baseModel, 'collectionFormat', collectionFormat)
  utils.setNotEmpty(baseModel, 'minimum', utils.findSchemaTest(schema, 'min'))
  utils.setNotEmpty(baseModel, 'maximum', utils.findSchemaTest(schema, 'max'))

  return baseModel
}

utils.getFirstInclusionType = function (schema) {
  var inclusionTypes = Hoek.reach(schema, '_inner.inclusions')
  return _.first(inclusionTypes)
}

utils.getPathPrefix = function (path, n) {
  if (path != null) {
    n = n >= 1 ? n : 1
    return path.substring(1, path.split('/', n + 1).join('/').length)
  }

  return null
}

utils.getPathTags = function (path, pathLevel) {
  var tagPath = utils.getPathPrefix(path, pathLevel)
  return tagPath != null && tagPath !== '' ? [tagPath] : []
}

utils.getTags = function (settings) {
  return _.map(settings.tags, function (value, key) {
    if (typeof value === 'string') {
      return { name: key, description: value }
    } else {
      return value
    }
  })
}

utils.getFormat = function (schema) {
  var format = utils.getMeta(schema, 'format')

  if (format) {
    return format
  }

  return utils.getPrimitiveType(schema) === 'date' && utils.getMetaSwaggerType(schema) == null ? 'date-time' : undefined
}

utils.mapSwaggerType = function (schema, type) {
  if (utils.getMetaSwaggerType(schema) == null) {
    switch (type) {
      case 'date':
        return 'string'
      default:
        return type
    }
  } else {
    return type
  }
}
