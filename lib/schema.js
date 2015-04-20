var Joi = require('joi')
var schemas = module.exports = {}
var swaggerVersion = Joi.string().valid('1.2').required()
var produces = Joi.array().items(Joi.string()).optional()
var consumes = Joi.array().items(Joi.string()).optional()
var tags = Joi.array().items(Joi.string())

schemas.Info = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  termsOfServiceUrl: Joi.string().optional(),
  contact: Joi.string().optional(),
  license: Joi.string().optional(),
  licenseUrl: Joi.string().optional()
}).meta({
  className: 'Info'
})

schemas.APIReference = Joi.object({
  path: Joi.string().required(),
  description: Joi.string().optional()
}).meta({
  className: 'APIReference'
})

schemas.ResourceListing = Joi.object({
  swaggerVersion: swaggerVersion,
  apiVersion: Joi.string().optional(),
  basePath: Joi.string().optional(),
  apis: Joi.array().items(schemas.APIReference).required(),
  info: schemas.Info,
  authorizations: Joi.any()
}).meta({
  className: 'ResourceListing'
})

schemas.Items = Joi.object({
  type: Joi.string().optional(),
  $ref: Joi.string().optional()
}).xor('type', '$ref').meta({
  className: 'Items'
})

schemas.Parameter = Joi.object({
  paramType: Joi.string().valid(['path', 'query', 'body', 'header',
    'form'
  ]).required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
  format: Joi.string().optional(),
  minimum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  maximum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  items: schemas.Items.optional(),
  defaultValue: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  enum: Joi.array().items(Joi.string().allow('')).optional(),
  description: Joi.string().optional(),
  required: Joi.boolean().optional(),
  allowMultiple: Joi.boolean().optional()
}).meta({
  className: 'Parameter'
})

schemas.ResponseMessage = Joi.object({
  code: Joi.number().required(),
  message: Joi.string().required(),
  responseModel: Joi.string().optional()
}).meta({
  className: 'ResponseMessage'
})

schemas.Operation = Joi.object({
  method: Joi.string().valid(['GET', 'HEAD', 'POST', 'PUT', 'PATCH',
    'DELETE', 'OPTIONS'
  ]).required(),
  summary: Joi.string().optional(),
  notes: Joi.string().allow('').optional(),
  nickname: Joi.string().required(),
  authorizations: Joi.any(),
  type: Joi.string().required(),
  items: schemas.Items.optional(),
  parameters: Joi.array().items(schemas.Parameter).optional(),
  responseMessages: Joi.array().items(schemas.ResponseMessage).optional(),
  produces: produces,
  consumes: consumes,
  deprecated: Joi.boolean().optional()
}).meta({
  className: 'Operation'
})

schemas.API = Joi.object({
  path: Joi.string().required(),
  description: Joi.string().optional(),
  operations: Joi.array().items(schemas.Operation)
}).meta({
  className: 'API'
})

schemas.Property = Joi.object({
  type: Joi.string(),
  $ref: Joi.string(),
  format: Joi.string().optional(),
  defaultValue: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  enum: Joi.array().items(Joi.string()).optional(),
  minimum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  maximum: Joi.alternatives([Joi.string(), Joi.number()]).optional(),
  items: schemas.Items.optional(),
  uniqueItems: Joi.boolean().optional(),
  // remaining (no data types)
  description: Joi.string().optional(),
  required: Joi.boolean().optional() // TODO: remove!
}).xor('type', '$ref')

schemas.Properties = Joi.object({}).pattern(/.*/, schemas.Property).meta({
  className: 'Properties'
})

schemas.Model = Joi.object({
  type: Joi.string().optional(), // TODO: remove!
  id: Joi.string().required(),
  description: Joi.string().optional(),
  required: Joi.array().items(Joi.string()).optional(),
  properties: schemas.Properties,
  subTypes: Joi.array().items(Joi.string()).optional(),
  discriminator: Joi.string().optional()
}).meta({
  className: 'Model'
})

schemas.Models = Joi.object({}).pattern(/.*/, schemas.Model).meta({
  className: 'Models'
})

schemas.APIDeclaration = Joi.object({
  swaggerVersion: swaggerVersion,
  apiVersion: Joi.string().optional(),
  basePath: Joi.string().optional(),
  resourcePath: Joi.string().optional(),
  apis: Joi.array().items(schemas.API).required(),
  models: schemas.Models,
  produces: produces,
  consumes: consumes,
  authorizations: Joi.any()
}).meta({
  className: 'APIDeclaration'
})

// Plugin options
schemas.PluginOptions = Joi.object({
  host: Joi.string().optional(),
  protocol: Joi.string().optional(),
  requiredTags: tags.optional(),
  produces: produces.optional(),
  consumes: consumes.optional(),
  apiVersion: Joi.string().optional(),
  endpoint: Joi.string().optional(),
  endpointDeclarationSuffix: Joi.string().optional(),
  routeTags: Joi.array().items(Joi.string()).optional(),
  stripPrefix: Joi.string().optional(),
  responseValidation: Joi.boolean().optional(),
  cache: Joi.any(),
  descriptions: Joi.object().pattern(/.*/, Joi.string()),
  info: schemas.Info
})
