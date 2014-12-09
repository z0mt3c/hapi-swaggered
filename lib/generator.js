var Hoek = require('hoek');
var _ = require('lodash');
var utils = require('./utils');
var generator = module.exports = {};

generator.createProperties = function(schema, models) {
    return _.reduce(Hoek.reach(schema, '_inner.children'), function(memo, property) {
        memo[property.key] = generator.fromJoiSchema(property.schema, property.key, models);
        return memo;
    }, {});
};

generator.newModel = function(schema, definitions) {
    Hoek.assert(schema._type !== 'array', 'generator.newModel does not support array schema');

    // Don't generate model for primitive types!
    if (utils.isPrimitiveSwaggerType(schema._type)) {
        var format = Hoek.reach(schema, '_settings.format');
        var type = _.find(schema._tests, {
            name: 'integer'
        }) ? 'integer' : schema._type;
        return {
            type: type,
            format: format || undefined
        };
    }

    var model = {
        required: [],
        //description: schema._description,
        properties: {}
    };

    var properties = generator.createProperties(schema, definitions);
    model.properties = _.reduce(properties, function(memo, value, key) {
        if (value.required) {
            model.required.push(key);
        }

        memo[key] = _.pick(value, ['type', 'format', 'items', 'default', 'description', '$ref', 'enum', 'minimum', 'maximum']);
        return memo;
    }, model.properties);

    var modelName = utils.generateNameWithFallback(schema, definitions, model);
    definitions[modelName] = model;

    return {
        $ref: modelName
    };
};

generator.extractAsDefinition = function(schema, definitions, definition) {
    if (definition && definition.type === 'array') {
        var required = definition.required;
        delete definition.required;
        var name = utils.generateNameWithFallback(schema, definitions, definition);
        definitions[name] = definition;
        return {
            required: required,
            description: definition.description,
            $ref: name
        };
    }

    return definition;
};

generator.fromJoiSchema = function(schema, models) {
    Hoek.assert(schema, 'Schema undefined');
    Hoek.assert(schema.isJoi, 'Schema is no joi schema');

    var required = Hoek.reach(schema, '_flags.presence') === 'required';
    var description = schema._description;
    var defaultValue = Hoek.reach(schema, '_flags.default');
    var format = Hoek.reach(schema, '_settings.format');
    var min = _.find(schema._tests, {
        name: 'min'
    });
    var max = _.find(schema._tests, {
        name: 'max'
    });
    var enumValues = Hoek.reach(schema, '_flags.allowOnly') === true ? Hoek.reach(schema, '_valids._set') : undefined;
    enumValues = _.isArray(enumValues) && enumValues.length > 0 ? enumValues : undefined;

    var baseModel = {
        required: required
    };

    utils.setNotEmpty(baseModel, 'default', defaultValue);
    utils.setNotEmpty(baseModel, 'description', description);
    utils.setNotEmpty(baseModel, 'format', format);
    utils.setNotEmpty(baseModel, 'minimum', min ? min.arg : undefined);
    utils.setNotEmpty(baseModel, 'maximum', max ? max.arg : undefined);
    utils.setNotEmpty(baseModel, 'enum', enumValues);

    if (schema._type === 'object') {
        return Hoek.merge(baseModel, generator.newModel(schema, models));
    } else if (schema._type === 'array') {
        //TODO: swagger array length:
        //var min = _.find(schema._tests, { name: 'min' });
        //var max = _.find(schema._tests, { name: 'max' });

        var modelExtension = {
            type: schema._type
        };

        var inclusionTypes = Hoek.reach(schema, '_inner.inclusions');
        var firstInclusionType = _.first(inclusionTypes);

        if (firstInclusionType) {
            var firstInclusionTypeModel = generator.newModel(firstInclusionType, models);

            if (utils.isPrimitiveSwaggerType(firstInclusionTypeModel.type)) {
                modelExtension.items = _.pick(firstInclusionTypeModel, ['type', 'format']);
            } else {
                modelExtension.items = _.pick(firstInclusionTypeModel, ['$ref']);
            }
        }

        return Hoek.merge(baseModel, modelExtension);
    } else if (schema._type === 'string') {
        var stringExtension = {
            type: schema._type
        };

        return Hoek.merge(baseModel, stringExtension);
    } else if (schema._type === 'number') {
        var type = _.find(schema._tests, {
            name: 'integer'
        }) ? 'integer' : schema._type;

        var numberExtension = {
            type: type
        };

        return Hoek.merge(baseModel, numberExtension);
        // } else if (schema._type === 'boolean') {
        // } else if (schema._type === 'date') {
    } else {
        return Hoek.merge(baseModel, {
            type: utils.getMeta(schema, 'swaggerType') || schema._type
        });
    }
};
