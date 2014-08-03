var Hoek = require('hoek');
var _ = require('lodash');

var utils = require('./utils');

var generator = module.exports = {};


generator.createProperties = function (schema, key, models) {
    return _.reduce(Hoek.reach(schema, '_inner.children'), function (memo, property) {
        memo[property.key] = generator.fromJoiSchema(property.schema, property.key, models);
        return memo;
    }, {});
};

generator.newModel = function (schema, key, models) {
    // Don't generate model for primitive types!
    if (utils.isPrimitiveSwaggerType(schema._type)) {
        var type = _.find(schema._tests, { name: 'integer' }) ? 'integer' : schema._type;
        return { type: type };
    }

    // TODO: format key
    var modelName = Hoek.reach(schema, '_settings.className') || key || utils.generateNameFromSchema(schema);

    var model = {
        id: modelName,
        type: schema._type,
        properties: generator.createProperties(schema, key, models)
    };

    if (models[modelName] && !_.isEqual(models[modelName], model)) {
        modelName = utils.generateFallbackName(modelName);
        model.id = modelName;
    }

    models[modelName] = model;

    return {
        type: modelName
    };
};

generator.fromJoiSchema = function (schema, key, models) {
    if (!schema) {
        return null;
    }

    Hoek.assert(schema.isJoi, 'Schema is no joi schema');

    var required = Hoek.reach(schema, '_flags.presence') === 'required';
    var description = schema._description;
    var defaultValue = Hoek.reach(schema, '_flags.default');
    var min = _.find(schema._tests, { name: 'min' });
    var max = _.find(schema._tests, { name: 'max' });
    var enumValues = Hoek.reach(schema, '_flags.allowOnly') === true ? Hoek.reach(schema, '_valids._set') : undefined;
    enumValues = _.isArray(enumValues) && enumValues.length > 0 ? enumValues : undefined;

    var baseModel = {
        required: required
    };

    utils.setNotEmpty(baseModel, 'defaultValue', defaultValue);
    utils.setNotEmpty(baseModel, 'description', description);
    utils.setNotEmpty(baseModel, 'minimum', min ? min.arg : undefined);
    utils.setNotEmpty(baseModel, 'maximum', max ? max.arg : undefined);
    utils.setNotEmpty(baseModel, 'enum', enumValues);

    if (schema._type === 'object') {
        return Hoek.merge(baseModel, generator.newModel(schema, key, models));
    } else if (schema._type === 'array') {
        //Not possible in swagger array length:
        //var min = _.find(schema._tests, { name: 'min' });
        //var max = _.find(schema._tests, { name: 'max' });

        var modelExtension = {  type: schema._type };
        var inclusionTypes = Hoek.reach(schema, '_inner.inclusions');

        if (_.isArray(inclusionTypes)) {
            var firstInclusionType = _.first(inclusionTypes);
            var firstInclusionTypeModel = generator.newModel(firstInclusionType, key, models);

            if (utils.isPrimitiveSwaggerType(firstInclusionTypeModel.type)) {
                modelExtension.items = { 'type': firstInclusionTypeModel.type };
            } else {
                modelExtension.items = { '$ref': firstInclusionTypeModel.type };
            }
        }

        return Hoek.merge(baseModel, modelExtension);
    } else if (schema._type === 'string') {
        var stringExtension = {
            type: schema._type
        };

        return Hoek.merge(baseModel, stringExtension);
    } else if (schema._type === 'number') {
        var type = _.find(schema._tests, { name: 'integer' }) ? 'integer' : schema._type;

        var numberExtension = {
            type: type
        };

        return Hoek.merge(baseModel, numberExtension);
    // } else if (schema._type === 'boolean') {
    // } else if (schema._type === 'date') {
    } else {
        return Hoek.merge(baseModel, {
            type: schema._type
        });
    }
};
