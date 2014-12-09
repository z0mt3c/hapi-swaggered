var Hoek = require('hoek');
var _ = require('lodash');
var utils = require('./utils');
var generator = module.exports = {};

generator.createProperties = function(schema, definitions) {
    return _.reduce(Hoek.reach(schema, '_inner.children'), function(memo, property) {
        memo[property.key] = generator.fromJoiSchema(property.schema, definitions);
        return memo;
    }, {});
};

generator.newModel = function(schema, definitions) {
    var schemaType = utils.getPrimitiveType(schema);
    Hoek.assert(schemaType !== 'array', 'generator.newModel does not support array schema');

    // Don't generate model for primitive types!
    if (utils.isPrimitiveSwaggerType(schemaType)) {
        var format = utils.getMeta(schema, 'format');

        return {
            type: schemaType,
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

    if (model.required.length === 0) {
        delete model.required;
    }

    var modelName = utils.generateNameWithFallback(schema, definitions, model);
    definitions[modelName] = model;

    return {
        $ref: modelName
    };
};

generator.newArray = function(schema, definitions, arrayModel) {
    //TODO: Support array length in swagger schema. All arrays have to be separate schemas for this. Correct?
    arrayModel.type = 'array';

    // TODO: Improve array handling, multiple inclusion types are not supported by swagger specs. Only possiblity would be to extract common denominator as interface-schema.
    var firstInclusionType = utils.getFirstInclusionType(schema);

    if (firstInclusionType) {
        var firstInclusionTypeModel = generator.fromJoiSchema(firstInclusionType, definitions);

        if (firstInclusionTypeModel.$ref) {
            arrayModel.items = _.pick(firstInclusionTypeModel, ['$ref']);
        } else {
            arrayModel.items = _.pick(firstInclusionTypeModel, ['type', 'format']);
        }
    } else {
        //TODO: array without type?
        //arrayModel.items = { type: '' }
    }

    return arrayModel;
    /*
    // May extract all arrays and use a reference? Sometimes inline required?
    var required = arrayModel.required;
    delete arrayModel.required;
    var name = utils.generateNameWithFallback(schema, definitions, arrayModel);
    definitions[name] = arrayModel;

    return {
        required: required,
        description: arrayModel.description,
        $ref: name
    };
    */
};

generator.extractAsDefinition = function(schema, definitions, definition) {
    if (definition.type === 'array') {
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

generator.fromJoiSchema = function(schema, definitions) {
    Hoek.assert(schema, 'Schema undefined');
    Hoek.assert(schema.isJoi, 'Schema is no joi schema');
    var schemaType = utils.getPrimitiveType(schema);
    var swaggerType = utils.getMeta(schema, 'swaggerType') || schemaType;
    var baseModel = utils.parseBaseModelAttributes(schema);

    if (schemaType === 'object') {
        return Hoek.merge(baseModel, generator.newModel(schema, definitions));
    } else if (schemaType === 'array') {
        return generator.newArray(schema, definitions, baseModel);
    } else {
        baseModel.type = swaggerType;
        return baseModel;
    }
};
