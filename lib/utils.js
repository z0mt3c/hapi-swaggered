'use strict'

const Hoek = require('hoek')
const _ = require('lodash')
const utils = module.exports = {}

utils.generateNameFromSchema = function (schema) {
  const isArray = schema && schema._type === 'array'
  const isPrimitive = schema && utils.isPrimitiveSwaggerType(schema._type)
  let keys = []

  if (isPrimitive) {
    return _.upperFirst(utils.getPrimitiveType(schema))
  } else if (isArray) {
    return 'Array'
  } else {
    const children = _.get(schema, '_inner.children')
    keys = _.map(_.map(children, 'key'), _.upperFirst)
  }

  if (_.isEmpty(keys)) {
    return 'EmptyModel'
  }

  return [...keys, 'Model'].join('')
}

utils.parseTags = function (tags) {
  if (_.isEmpty(tags)) {
    return null
  }

  const tagsList = _.isArray(tags) ? tags : tags.split(',')
  const included = []
  const excluded = []

  _.each(tagsList, (tag) => {
    tag = tag.trim()
    const firstChar = tag.trim().charAt(0)

    if (firstChar === '+') {
      included.push(tag.substr(1))
    } else if (firstChar === '-') {
      excluded.push(tag.substr(1))
    } else {
      included.push(tag)
    }
  })

  return { included, excluded }
}

utils.filterRoutesByRequiredTags = function (routingTable, requiredTags) {
  if (_.isEmpty(requiredTags)) {
    return routingTable
  }

  return _.filter(routingTable, (route) => {
    const routeTags = route.settings ? route.settings.tags : null
    return Hoek.intersect(routeTags, requiredTags).length === requiredTags.length
  })
}

utils.filterRoutesByTagSelection = function (routingTable, includedTags, excludedTags) {
  return _.filter(routingTable, (route) => {
    const routeTags = route.settings ? route.settings.tags : null

    if (Hoek.intersect(routeTags, excludedTags).length > 0) {
      return false
    }

    const hasNoTags = !includedTags || includedTags.length === 0
    const hasNoIntersects = Hoek.intersect(routeTags, includedTags).length > 0

    return hasNoTags || hasNoIntersects
  })
}

utils.getCurrentSettings = function (settings, serverSettings) {
  if (serverSettings == null) {
    return settings
  } else {
    const currentSettings = Hoek.applyToDefaults(settings, serverSettings)
    currentSettings.tags = _.union(utils.getTags(settings), utils.getTags(serverSettings))
    return currentSettings
  }
}

utils.stripRoutesPrefix = function (routingTable, stripPrefix) {
  if (!stripPrefix) {
    return routingTable
  }

  const stripPrefixLength = stripPrefix.length

  return _.reduce(routingTable, (memo, route) => {
    if (route.path.indexOf(stripPrefix) === 0) {
      const routeClone = _.clone(route)
      if (route.path.length > stripPrefixLength) {
        routeClone.path = route.path.substr(stripPrefixLength)
        memo.push(routeClone)
      }
    }

    return memo
  }, [])
}

utils.filterRoutesByPrefix = function (routingTable, prefix) {
  const prefixLength = prefix.length
  return _.filter(routingTable, (route) => {
    const routePath = route.path
    const startsWithPrefix = routePath.indexOf(prefix) === 1

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
  const routesPerPath = _.reduce(routingTable, (memo, route) => {
    const path = route.path
    if (/\?/.test(path)) {
      const secondaryRoute = _.cloneDeep(route)
      secondaryRoute.path = path.substr(0, path.search(/\/\{[^}]+\?\}/))
      const secondaryPath = utils.sanitizePath(secondaryRoute.path)
      const entry = memo[secondaryPath] = memo[secondaryPath] || []
      entry.push(secondaryRoute)
    }

    const primaryPath = utils.sanitizePath(route.path)
    const entry = memo[primaryPath] = memo[primaryPath] || []
    entry.push(route)
    return memo
  }, {})

  return routesPerPath
}

utils.extractAPIKeys = function (routingTable) {
  const apiPrefixes = _.reduce(routingTable, (memo, route) => {
    const path = route.path

    if (path !== '/') {
      const indexOfFirstSlash = path.indexOf('/', 1)
      const prefix = indexOfFirstSlash !== -1 ? path.substring(0, indexOfFirstSlash) : path.substr(0)

      if (memo.indexOf(prefix) === -1) {
        memo.push(prefix)
      }
    }

    return memo
  }, [])

  apiPrefixes.sort()

  return apiPrefixes
}

const numberSuffix = /_([0-9]+)$/

utils.generateFallbackName = function (modelName) {
  if (_.isEmpty(modelName)) {
    return null
  }

  const match = numberSuffix.exec(modelName)

  if (match) {
    const count = parseInt(match[1], 10) + 1
    modelName = modelName.replace(numberSuffix, `_${count}`)
  } else {
    modelName = `${modelName}_${2}`
  }

  return modelName
}

const primitiveSwaggerTypes = ['integer', 'number', 'string', 'boolean', 'string', 'date']
const supportedTypes = primitiveSwaggerTypes.concat('object', 'array')

utils.isPrimitiveSwaggerType = function (type) {
  return _.includes(primitiveSwaggerTypes, type)
}

utils.getMetaSwaggerType = function (schema) {
  return utils.getMeta(schema, 'swaggerType')
}

utils.isSupportedSchema = function (schema) {
  return schema != null && !(schema instanceof Function) && _.get(schema, '_flags.func') !== true && schema.isJoi === true && (utils.isSupportedType(utils.getPrimitiveType(schema)) || utils.getMetaSwaggerType(schema) != null)
}

utils.isSupportedType = function (type) {
  return type != null && _.includes(supportedTypes, type)
}

utils.setNotEmpty = function (target, key, value) {
  if (_.isNumber(value) || value === false || !_.isEmpty(value)) {
    target[key] = value
  }

  return target
}

utils.generateRouteNickname = function (route) {
  return route.method + route.path.replace(/[/|{|}]/gi, '_')
}

utils.getSetting = function (schema, key) {
  if (_.get(schema, `_settings.${key}`)) {
    return schema._settings[key]
  }

  return undefined
}

utils.getMeta = function (schema, key) {
  // merge meta objects - last one wins
  const meta = schema ? _.extend.apply(null, schema._meta) : undefined
  // Still fallback to settings for joi <6
  return meta && !_.isUndefined(meta[key]) ? meta[key] : utils.getSetting(schema, key)
}

utils.generateName = function (schema) {
  return utils.getMeta(schema, 'className') || utils.generateNameFromSchema(schema)
}

utils.generateNameWithFallback = function (schema, definitions, definition) {
  let definitionName = utils.generateName(schema)

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

utils.getDescription = function (schema) {
  return utils.getMeta(schema, 'description') || utils.getSchemaDescription(schema) || undefined
}

utils.getPrimitiveType = function (schema) {
  const swaggerType = utils.getMetaSwaggerType(schema)

  if (swaggerType != null) {
    return swaggerType
  }

  const isInteger = _.find(schema._tests, { name: 'integer' }) != null
  return isInteger ? 'integer' : schema._type
}

utils.findSchemaTest = function (schema, name) {
  const max = _.find(schema._tests, {
    name: name
  })

  return max ? max.arg : undefined
}

utils.parseBaseModelAttributes = function (schema) {
  const required = _.get(schema, '_flags.presence') === 'required'
  const description = schema._description
  const defaultValue = _.get(schema, '_flags.default')
  const format = utils.getFormat(schema)
  const collectionFormat = utils.getMeta(schema, 'collectionFormat')
  const enumValues = _.get(schema, '_flags.allowOnly') === true ? _.filter(Array.from(_.get(schema, '_valids._set')), _.isString) : undefined

  const baseModel = {
    required: required
  }

  utils.setNotEmpty(baseModel, 'description', description)

  utils.setNotEmpty(baseModel, 'example', schema._examples[0])

  // TODO: Following working? Not covered by tests!
  utils.setNotEmpty(baseModel, 'default', defaultValue)
  utils.setNotEmpty(baseModel, 'format', format)
  utils.setNotEmpty(baseModel, 'enum', enumValues)
  utils.setNotEmpty(baseModel, 'collectionFormat', collectionFormat)
  const minValue = utils.findSchemaTest(schema, 'min')
  const maxValue = utils.findSchemaTest(schema, 'max')
  if (utils.getPrimitiveType(schema) === 'string') {
    utils.setNotEmpty(baseModel, 'minLength', minValue)
    utils.setNotEmpty(baseModel, 'maxLength', maxValue)
  } else {
    utils.setNotEmpty(baseModel, 'minimum', minValue)
    utils.setNotEmpty(baseModel, 'maximum', maxValue)
  }

  return baseModel
}

utils.getFirstInclusionType = function (schema) {
  const inclusionTypes = _.get(schema, '_inner.inclusions')
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
  const tagPath = utils.getPathPrefix(path, pathLevel)
  return tagPath != null && tagPath !== '' ? [tagPath] : []
}

utils.getTags = function (settings) {
  return _.map(settings.tags, (value, key) => {
    if (typeof value === 'string') {
      return { name: key, description: value }
    } else {
      return value
    }
  })
}

utils.getFormat = function (schema) {
  const format = utils.getMeta(schema, 'format')

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
  }

  return type
}

utils.adjustOptionalPathParams = function (path, parameters) {
  parameters = _.reduce(parameters, function (memo, param) {
    // If not a path param, include it, no questions asked
    if (param.in !== 'path') {
      memo.push(param)
    }

    // If this parameter is a path param and its name is in the path,
    // ensure it is marked required to produce valid Swagger 2.0
    if (param.in === 'path' && path.indexOf(param.name) !== -1) {
      param.required = true
      memo.push(param)
    }

    // Otherwise, the param is marked as a path param, but is not in the
    // path, which means it's a byproduct of duplicating routes to produce
    // valid Swagger 2.0 from paths with optional parameters, so don't
    // include it

    return memo
  }, [])

  return parameters
}
