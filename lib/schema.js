var Joi = require('joi');
var schemas = module.exports = {};
var swaggerVersion = Joi.string().valid('2.0').required();
var dataTypes = Joi.string().valid(['integer', 'number', 'string', 'boolean', 'array', 'file']);
var dataFormat = Joi.string().valid(['int32', 'int64', 'float', 'double', 'byte', 'date', 'date-time']);
var arrayOfStrings = Joi.array().includes(Joi.string());
var reference = Joi.string();
var collectionFormat = Joi.string().valid(['csv', 'ssv', 'tsv', 'pipes', 'multi']);

schemas.SimpleReference = Joi.object({
	$ref: reference
}).options({
	className: 'SimpleReference'
});

schemas.Reference = Joi.object({
	$ref: reference,
	type: Joi.string(),
	items: Joi.object({
		$ref: reference.required()
	})
}).xor(['$ref', 'items']).options({
	className: 'Reference'
});

schemas.ExternalDocs = Joi.object({
	description: Joi.string().required(),
	url: Joi.string().required()
}).options({
	className: 'ExternalDocs'
});


schemas.Item = Joi.object({
	type: dataTypes.required(),
	format: dataFormat.optional(),
	items: Joi.any(),
	default: Joi.any().optional(),
	maximum: Joi.number().optional(),
	minimum: Joi.number().optional()
	/*
	collectionFormat: collectionFormat.optional(),
	exclusiveMaximum: Joi.boolean().optional(),
	exclusiveMinimum: Joi.boolean().optional(),
	maxLength: Joi.number().integer().optional(),
	minLength: Joi.number().integer().optional(),
	pattern: Joi.string().optional(),
	maxItems: Joi.number().integer().optional(),
	minItems: Joi.number().integer().optional(),
	uniqueItems: Joi.boolean().optional(),
	multipleOf: Joi.number().optional(),
	enum: Joi.any().optional()
	*/
}).options({
	className: 'Items'
});

schemas.Property = Joi.object().keys({
	type: Joi.string().optional(),
	description: Joi.string().optional(),
	format: Joi.string().optional(),
	items: Joi.alternatives().try(schemas.SimpleReference, schemas.Item).optional(),
	default: Joi.any().optional(),
	enum: Joi.any().optional(),
	maximum: Joi.number().optional(),
	minimum: Joi.number().optional()
	//schema: schemas.Reference.optional()
}).options({
	className: 'Property'
});

schemas.Schema = Joi.object({
	title: Joi.string().optional(),
	description: Joi.string().optional(),
	default: Joi.any().optional(),
	multipleOf: Joi.number().optional(),
	format: dataFormat.optional(),
	required: Joi.boolean().optional(),
	collectionFormat: collectionFormat.optional(),
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
	maxProperties: Joi.number().optional(),
	minProperties: Joi.number().optional(),
	enum: Joi.any().optional(),
	type: dataTypes.required(),
	allOf: Joi.array().includes(schemas.Reference).optional(),
	properties: Joi.object({}).pattern(/.*/, schemas.Property).optional(),
	items: schemas.Reference.optional(),
	externalDocs: schemas.ExternalDocs.optional(),
	example: Joi.any().optional(),
	readOnly: Joi.boolean().optional()
}).options({className: 'Schema'});


schemas.Parameter = Joi.object({
	name: Joi.string().required(),
	in: Joi.string().valid(['query', 'header', 'path', 'formData', 'body']).required(),
	description: Joi.string().optional(),
	required: Joi.boolean().optional(),
	// if body
	schema: Joi.alternatives().when('in', {is: 'body', then: schemas.Reference.required()}),
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
	enum: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.any().optional()}),
	multipleOf: Joi.alternatives().when('in', {is: 'body', otherwise: Joi.number().optional()})
}).options({
	className: 'Parameter'
});

schemas.Response = Joi.object({
	description: Joi.string().optional(),
	schema: schemas.Reference.optional(),
	headers: Joi.any().optional(),
	examples: Joi.any().optional()
}).options({
	className: 'Response'
});

schemas.Responses = Joi.object({
	default: schemas.Response.optional() // optional in swagger ui
}).pattern(/^[0-9]{3}$/, schemas.Response).options({
	className: 'Responses'
});

schemas.Operation = Joi.object({
	tags: arrayOfStrings.optional(),
	summary: Joi.string().optional(),
	description: Joi.string().optional(),
	externalDocs: schemas.ExternalDocs.optional(),
	operationId: Joi.string().optional(),
	consumes: arrayOfStrings.optional(),
	produces: arrayOfStrings.optional(),
	parameters: Joi.array().includes(schemas.Parameter).optional(),
	responses: schemas.Responses, // required?
	schemes: arrayOfStrings.optional(),
	deprecated: Joi.boolean().optional(),
	security: Joi.any()
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
	parameters: Joi.array().includes(schemas.Parameter).optional()
}).options({
	className: 'Path'
});

schemas.Definition = Joi.object({
	title: Joi.string().optional(), // seen in swagger ui
	required: Joi.array().includes(Joi.string()),
	anyOf: Joi.array().includes(schemas.Reference),
	allOf: Joi.array().includes(schemas.Reference),
	oneOf: Joi.array().includes(schemas.Reference),
	properties: Joi.object({}).pattern(/.*/, schemas.Property)
}).options({
	className: 'Definition'
});

// Meta-Information
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

schemas.Tag = Joi.object({
	name: Joi.string().required(),
	description: Joi.string().optional(),
	externalDocs: schemas.ExternalDocs.optional()
}).options({
	className: 'Tag'
});

// Root
schemas.Swagger = Joi.object({
	swagger: swaggerVersion.required(),
	info: schemas.Info.optional(),
	host: Joi.string().optional(),
	basePath: Joi.string().optional(),
	schemes: arrayOfStrings,
	consumes: arrayOfStrings,
	produces: arrayOfStrings,
	paths: Joi.object({}).pattern(/^\/.*/, schemas.Path),
	definitions: Joi.object({}).pattern(/.*/, schemas.Definition),
	//parameters: Joi.array().includes(schemas.Parameter, schemas.Reference).optional()
	//responses: schemas.Responses,
	tags: Joi.array().includes(schemas.Tag).optional(),
	externalDocs: schemas.ExternalDocs.optional()
}).options({
	className: 'Swagger'
});

// Plugin options
schemas.PluginOptions = Joi.object({
	host: Joi.string().optional(),
	protocol: Joi.string().optional(),
	requiredTags: arrayOfStrings.optional(),
	produces: arrayOfStrings.optional(),
	consumes: arrayOfStrings.optional(),
	endpoint: Joi.string().optional(),
	endpointDeclarationSuffix: Joi.string().optional(),
	routeTags: Joi.array().includes(Joi.string()).optional(),
	stripPrefix: Joi.string().optional(),
	responseValidation: Joi.boolean().optional(),
	cache: Joi.any(),
	descriptions: Joi.object().pattern(/.*/, Joi.string()),
	info: schemas.Info
});
