var Joi = require('joi');
var schemas = module.exports = {};
var swaggerVersion = Joi.string().valid('1.2').required();

schemas.APIReference = Joi.object({
    path: Joi.string().required(),
    description: Joi.string().optional()
}).options({
    className: 'APIReference'
});

schemas.Info = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    termsOfServiceUrl: Joi.string().optional(),
    contact: Joi.string().optional(),
    license: Joi.string().optional(),
    licenseUrl: Joi.string().optional()
}).options({
    className: 'Info'
});

schemas.ResourceListing = Joi.object({
    swaggerVersion: swaggerVersion,
    apiVersion: Joi.string().optional(),
    basePath: Joi.string().optional(),
    apis: Joi.array().includes(schemas.APIReference).required(),
    info: schemas.Info,
    authorizations: Joi.any()
}).options({
    className: 'ResourceListing'
});


schemas.Items = Joi.object({
    type: Joi.string().optional(),
    $ref: Joi.string().optional()
}).xor('type', '$ref').options({
    className: 'Items'
});


var produces = Joi.array().includes(Joi.string()).optional();
var consumes = Joi.array().includes(Joi.string()).optional();

schemas.Parameter = Joi.object({
    paramType: Joi.string().valid(['path', 'query', 'body', 'header', 'form']).required(),
    name: Joi.string().required(),
    type: Joi.string().required(),
    format: Joi.string().optional(),
    minimum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    maximum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    items: schemas.Items.optional(),
    defaultValue: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    enum: Joi.array().includes(Joi.string().allow('')).optional(),
    description: Joi.string().optional(),
    required: Joi.boolean().optional(),
    allowMultiple: Joi.boolean().optional()
}).options({
    className: 'Parameter'
});

schemas.ResponseMessage = Joi.object({
    code: Joi.number().required(),
    message: Joi.string().required(),
    responseModel: Joi.string().optional()
}).options({
    className: 'ResponseMessage'
});


schemas.Operation = Joi.object({
    method: Joi.string().valid(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).required(),
    summary: Joi.string().optional(),
    notes: Joi.string().allow('').optional(),
    nickname: Joi.string().required(),
    authorizations: Joi.any(),
    type: Joi.string().required(),
    items: schemas.Items.optional(),
    parameters: Joi.array().includes(schemas.Parameter).optional(),
    responseMessages: Joi.array().includes(schemas.ResponseMessage).optional(),
    produces: produces,
    consumes: consumes,
    deprecated: Joi.boolean().optional()
}).options({
    className: 'Operation'
});

schemas.API = Joi.object({
    path: Joi.string().required(),
    description: Joi.string().optional(),
    operations: Joi.array().includes(schemas.Operation)
}).options({
    className: 'API'
});

schemas.Property = Joi.object({
    type: Joi.string(),
    $ref: Joi.string(),
    format: Joi.string().optional(),
    defaultValue: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    enum: Joi.array().includes(Joi.string()).optional(),
    minimum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    maximum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
    items: schemas.Items.optional(),
    uniqueItems: Joi.boolean().optional(),
    // remaining (no data types)
    description: Joi.string().optional(),
    required: Joi.boolean().optional() // TODO: remove!
}).xor('type', '$ref');

schemas.Properties = Joi.object({}).pattern(/.*/, schemas.Property).options({ className: 'Properties' });

schemas.Model = Joi.object({
    type: Joi.string().optional(), // TODO: remove!
    id: Joi.string().required(),
    description: Joi.string().optional(),
    required: Joi.array().includes(Joi.string()).optional(),
    properties: schemas.Properties,
    subTypes: Joi.array().includes(Joi.string()).optional(),
    discriminator: Joi.string().optional()
}).options({
    className: 'Model'
});

schemas.Models = Joi.object({}).pattern(/.*/, schemas.Model).options({ className: 'Models' });

schemas.APIDeclaration = Joi.object({
    swaggerVersion: swaggerVersion,
    apiVersion: Joi.string().optional(),
    basePath: Joi.string().optional(),
    resourcePath: Joi.string().optional(),
    apis: Joi.array().includes(schemas.API).required(),
    models: schemas.Models,
    produces: produces,
    consumes: consumes,
    authorizations: Joi.any()
}).options({
    className: 'APIDeclaration'
});
