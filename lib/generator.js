var Hoek = require('hoek');
var _ = require('lodash');

var utils = require('./utils');

var generator = module.exports = {};
var PRIMITIVE_TYPES = ['integer', 'number', 'string', 'boolean', 'string'];

generator.createProperties = function (schema, key, models) {
    return _.reduce(Hoek.reach(schema, '_inner.children'), function (memo, property) {
        memo[property.key] = generator.fromJoiSchema(property.schema, property.key, models);
        return memo;
    }, {})
};

generator.newModel = function (schema, key, models) {
    // Don't generate model for primitive types!
    if (_.contains(PRIMITIVE_TYPES, schema._type)) {
        return { type: schema._type };
    }

    var modelName = Hoek.reach(schema, '_settings.className') || key || utils.generateNameFromSchema(schema);

    var model = {
        id: modelName,
        type: schema._type,
        properties: generator.createProperties(schema, key, models)
    };

    //TODO check if overwrite? if yes: equals? otherwise use different name!
    models[modelName] = model;

    return {
        type: modelName
    };
};

generator.fromJoiSchema = function (schema, key, models) {
    if (!schema) {
        return null;
    }

    Hoek.assert(schema.isJoi, 'Schema is no Joi Schema');
    var required = Hoek.reach(schema, '_flags.presence') === 'required';
    var description = schema._description || undefined;
    var defaultValue = Hoek.reach(schema, '_flags.default');
    var enumValues = Hoek.reach(schema, '_flags.allowOnly') === true ? Hoek.reach(schema, '_valids._set') : undefined;
    enumValues = _.isArray(enumValues) && enumValues.length > 0 ? enumValues : undefined;

    var baseModel = {
        required: required,
        description: description
    };

    if (schema._type === 'object') {
        return Hoek.merge(baseModel, generator.newModel(schema, key, models));
    } else if (schema._type === 'array') {
        //var min = _.find(schema._tests, { name: 'min' });
        //var max = _.find(schema._tests, { name: 'max' });

        var modelExtension = {
            type: schema._type
            //minimum: min ? min.arg : undefined,
            //maximum: max ? max.arg : undefined
        };

        var inclusionTypes = Hoek.reach(schema, '_inner.inclusions');
        if (inclusionTypes) {
            var firstInclusionType = _.first(inclusionTypes);
            var firstInclusionTypeModel = generator.newModel(firstInclusionType, key, models);

            if (_.contains(PRIMITIVE_TYPES, firstInclusionTypeModel.type)) {
                modelExtension.items = { 'type': firstInclusionTypeModel.type };
            } else {
                modelExtension.items = { '$ref': firstInclusionTypeModel.type };
            }
        }

        return Hoek.merge(baseModel, modelExtension);
    } else if (schema._type === 'string') {
        return Hoek.merge(baseModel, {
            type: schema._type,
            'enum': enumValues,
            defaultValue: defaultValue || undefined
        });
    } else if (schema._type === 'number') {
        var type = _.find(schema._tests, { name: 'integer' }) ? 'integer' : schema._type;
        var min = _.find(schema._tests, { name: 'min' });
        var max = _.find(schema._tests, { name: 'max' });

        return Hoek.merge(baseModel, {
            type: type,
            minimum: min ? min.arg : undefined,
            maximum: max ? max.arg : undefined
        });
    // } else if (schema._type === 'boolean') {
    // } else if (schema._type === 'date') {
    } else {
        return Hoek.merge(baseModel, {
            type: schema._type
        });
    }
};
