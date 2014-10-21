var Hoek = require('hoek');
var _ = require('lodash');
var utils = require('./utils');
var generator = module.exports = {};

generator.createProperties = function(schema, key, models) {
	return _.reduce(Hoek.reach(schema, '_inner.children'), function(memo, property) {
		memo[property.key] = generator.fromJoiSchema(property.schema, property.key, models);
		return memo;
	}, {});
};

generator.newModel = function(schema, key, models) {
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

	var modelName = Hoek.reach(schema, '_settings.className') || key || utils.generateNameFromSchema(schema);

	var model = {
		required: [],
		//description: schema._description,
		properties: {}
	};

	var properties = generator.createProperties(schema, key, models);
	model.properties = _.reduce(properties, function(memo, value, key) {
		if (value.required) {
			model.required.push(key);
		}

		memo[key] = _.pick(value, ['type', 'format', 'items', 'default', 'description', '$ref', 'enum', 'minimum', 'maximum']);
		return memo;
	}, model.properties);


	if (models[modelName] && !_.isEqual(models[modelName], model)) {
		modelName = utils.generateFallbackName(modelName);
	}

	models[modelName] = model;

	return {
		$ref: modelName
	};
};

generator.fromJoiSchema = function(schema, key, models) {
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
		return Hoek.merge(baseModel, generator.newModel(schema, key, models));
	} else if (schema._type === 'array') {
		//Not possible in swagger array length:
		//var min = _.find(schema._tests, { name: 'min' });
		//var max = _.find(schema._tests, { name: 'max' });

		var modelExtension = {
			type: schema._type
		};
		var inclusionTypes = Hoek.reach(schema, '_inner.inclusions');
		var firstInclusionType = _.first(inclusionTypes);

		if (firstInclusionType) {
			var firstInclusionTypeModel = generator.newModel(firstInclusionType, key, models);

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
			type: Hoek.reach(schema, '_settings.swaggerType') || schema._type
		});
	}
};
