var Joi = require('joi');
var schemas = module.exports = {};
var swaggerVersion = Joi.number().valid(2.0).required();
var dataTypes = Joi.string().valid(['integer', 'number', 'string', 'boolean', 'array', 'file']);
var dataFormat = Joi.string().valid(['int32', 'int64', 'float', 'double', 'byte', 'date', 'date-time']);
var StringArray = Joi.array().includes(Joi.string());


// new
schemas.Contact = Joi.object({
	name: Joi.string().optional(),
	url: Joi.string().optional(),
	email: Joi.string().optional()
}).options({
	className: 'Contact'
});

schemas.License = Joi.object({
	name: Joi.string().required(),
	url: Joi.string().optional()
}).options({
	className: 'License'
});

schemas.Info = Joi.object({
	title: Joi.string().required(),
	description: Joi.string().optional(),
	termsOfService: Joi.string().optional(),
	contact: schemas.Contact.optional(),
	license: schemas.License.optional(),
	version: Joi.string().required()
}).options({
	className: 'Info'
});

var Reference = Joi.string();

schemas.Reference = Joi.object({
	'$ref': Reference.required()
}).options({
	className: 'Reference'
});

schemas.Item = Joi.object({
	type: dataTypes.optional(), // should be required
	format: dataFormat.optional(),
	items: Joi.any(),
	collectionFormat: Joi.string().valid(['csv', 'ssv', 'tsv', 'pipes', 'multi']).default('csv').optional(),
	default: Joi.any().optional(),
	maximum: Joi.number().optional(),
	exclusiveMaximum: Joi.boolean().optional(),
	minimum: Joi.number().optional(),
	exclusiveMinimum: Joi.boolean().optional(),
	maxLength: Joi.number().integer().optional(),
	minLength: Joi.number().integer().optional(),
	pattern: Joi.string().optional(),
	maxItems: Joi.number().integer().optional(),
	minItems: Joi.number().integer().optional(),
	uniqueItems: Joi.boolean().optional(),
	multipleOf: Joi.number().optional(),
	enum: Joi.any().optional()
}).options({
	className: 'Items'
});

schemas.Schema = Joi.object({
	$ref: Joi.string()
}).concat(schemas.Item).xor('type', '$ref').options({
	className: 'Schema'
});

schemas.Serializable = Joi.object({}).concat(schemas.Item).keys({
	items: Joi.alternatives().when('type', {is: 'array', then: schemas.Item.required()})
}).options({
	className: 'Serializable'
});


schemas.Parameter = Joi.object({
	name: Joi.string().required(),
	in: Joi.string().valid(['query', 'header', 'path', 'formData', 'body']).required(),
	description: Joi.string().optional(),
	required: Joi.boolean().optional(),
	// if body
	schema: Joi.alternatives().when('in', {is: 'body', then: schemas.Schema.optional()}),
	// else
	type: Joi.alternatives().when('in', {is: 'body', otherwise: dataTypes.required()}),
	format: Joi.alternatives().when('in', {is: 'body', otherwise: dataFormat.optional()}),
	items: Joi.alternatives().when('type', {is: 'array', then: schemas.Item.required()}),
	collectionFormat: Joi.alternatives().when('in', {
		is: 'body',
		otherwise: Joi.string().valid(['csv', 'ssv', 'tsv', 'pipes', 'multi']).default('csv').optional()
	}),
	default: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.any().optional()}),
	maximum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().optional()}),
	exclusiveMaximum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.boolean().optional()}),
	minimum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().optional()}),
	exclusiveMinimum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.boolean().optional()}),
	maxLength: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().integer().optional()}),
	minLength: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().integer().optional()}),
	pattern: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.string().optional()}),
	maxItems: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().integer().optional()}),
	minItems: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().integer().optional()}),
	uniqueItems: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.boolean().optional()}),
	multipleOf: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().optional()}),
	enum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.any().optional()})
}).options({
	className: 'Parameter'
});

schemas.Headers = Joi.object({}).pattern(/.*/, schemas.Serializable).options({
	className: 'Responses'
});

schemas.Response = Joi.object({
	description: Joi.string().required(),
	schema: schemas.Schema.optional(),
	headers: Joi.array().includes(schemas.Headers).optional(),
	examples: Joi.any().optional()
}).options({
	className: 'Response'
});

schemas.ExternalDocs = Joi.object({
	description: Joi.string().required(),
	url: Joi.string().required()
}).options({
	className: 'ExternalDocs'
});

schemas.Responses = Joi.object({
	default: schemas.Response.required()
}).pattern(/^[0-9]{3}$/, schemas.Response).options({
	className: 'Responses'
});

schemas.Operation = Joi.object({
	tags: StringArray.optional(),
	summary: Joi.string().optional(),
	description: Joi.string().optional(),
	externalDocs: schemas.ExternalDocs.optional(),
	operationId: Joi.string().optional(),
	consumes: StringArray.optional(),
	produces: StringArray.optional(),
	parameters: Joi.array().includes(schemas.Parameter, schemas.Reference).optional(),
	responses: schemas.Responses,
	schemes: StringArray.optional(),
	deprecated: Joi.boolean().optional(),
	security: Joi.any() // TBD
}).options({
	className: 'Operation'
});

schemas.Path = Joi.object({
	get: schemas.Operation.optional(),
	put: schemas.Operation.optional(),
	post: schemas.Operation.optional(),
	delete: schemas.Operation.optional(),
	options: schemas.Operation.optional(),
	head: schemas.Operation.optional(),
	patch: schemas.Operation.optional(),
	parameters: Joi.array().includes(schemas.Parameter).optional(),
	$ref: Reference.optional()
}).options({
	className: 'Path'
});

schemas.Paths = Joi.object({})
	.pattern(/^\/.*/, schemas.Path)
	// Reserved for schema extensions:
	//.pattern(/^x-.*/, Joi.any())
	.options({
		className: 'Paths'
	});

schemas.Property = Joi.object().keys({
	type: Joi.string().optional(),
	format: Joi.string().optional(),
	items: schemas.Item.optional(),
	'$ref': Joi.string()
}).options({
	className: 'Property'
});

schemas.Properties = Joi.object({}).pattern(/.*/, schemas.Property).options({
	className: 'Properties'
});

schemas.Definition = Joi.object({
	required: Joi.array().includes(Joi.string()),
	// recursion?!
	anyOf: Joi.array().includes(Joi.any()),
	allOf: Joi.array().includes(Joi.any()),
	oneOf: Joi.array().includes(Joi.any()),
	properties: schemas.Properties
}).options({
	className: 'Definition'
});

schemas.Definitions = Joi.object({}).pattern(/.*/, schemas.Definition).options({
	className: 'Definitions'
});

schemas.Tag = Joi.object({
	name: Joi.string().required(),
	description: Joi.string().optional(),
	externalDocs: schemas.ExternalDocs.optional()
}).options({
	className: 'Tag'
});

schemas.Swagger = Joi.object({
	swagger: swaggerVersion.required(),
	info: schemas.Info.required(),
	host: Joi.string().optional(),
	basePath: Joi.string().optional(),
	schemes: StringArray,
	consumes: StringArray,
	produces: StringArray,
	paths: schemas.Paths,
	definitions: schemas.Definitions,
	//parameters: Joi.array().includes(schemas.Parameter, schemas.Reference).optional()
	//responses: schemas.Responses,
	tags: Joi.array().includes(schemas.Tag).optional(),
	externalDocs: schemas.ExternalDocs.optional()
}).options({
	className: 'Swagger'
});
