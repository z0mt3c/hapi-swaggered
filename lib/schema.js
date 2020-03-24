'use strict'

const Joi = require('joi')
const schemas = module.exports = {}
const swaggerVersion = Joi.string().valid('2.0').required()
const dataTypes = Joi.string().valid(['integer', 'number', 'string', 'boolean', 'array', 'file'])
const dataFormat = Joi.string().valid(['int32', 'int64', 'float', 'double', 'byte', 'date', 'date-time'])
const arrayOfStrings = Joi.array().items(Joi.string())
const reference = Joi.string()
// var collectionFormat = Joi.string().valid(['csv', 'ssv', 'tsv', 'pipes', 'multi'])

// reference: https://github.com/swagger-api/swagger-spec/blob/master/schemas/v2.0/schema.json

schemas.SimpleReference = Joi.object({
  $ref: reference
}).meta({
  className: 'SimpleReference'
})

schemas.Reference = Joi.object({
  $ref: reference,
  type: Joi.string(),
  items: Joi.object({
    $ref: reference.required()
  })
}).xor(['$ref', 'items']).meta({
  className: 'Reference'
})

schemas.ExternalDocs = Joi.object({
  description: Joi.string().required(),
  url: Joi.string().required()
}).meta({
  className: 'ExternalDocs'
})

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
}).meta({
  className: 'Items'
})

schemas.Property = Joi.object().keys({
  type: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  format: Joi.string().optional(),
  items: Joi.alternatives().try(schemas.SimpleReference, schemas.Item).optional(),
  default: Joi.any().optional(),
  enum: Joi.any().optional(),
  maximum: Joi.number().optional(),
  minimum: Joi.number().optional(),
  maxLength: Joi.number().optional(),
  minLength: Joi.number().optional(),
  collectionFormat: Joi.string().optional()
// schema: schemas.Reference.optional()
}).meta({
  className: 'Property'
})

schemas.Parameter = Joi.object({
  name: Joi.string().required(),
  in: Joi.string().valid(['query', 'header', 'path', 'formData', 'body']).required(),
  description: Joi.string().allow('').optional(),
  required: Joi.boolean().optional(),
  // if body
  schema: Joi.alternatives().when('in', { is: 'body', then: Joi.alternatives().try(schemas.Reference.required(), schemas.Property) }),
  // else
  type: Joi.alternatives().when('in', { is: 'body', otherwise: dataTypes.required() }),
  format: Joi.alternatives().when('in', { is: 'body', otherwise: dataFormat.optional() }),
  items: Joi.alternatives().when('type', { is: 'array', then: Joi.alternatives().try(schemas.SimpleReference, schemas.Item).required() }),
  collectionFormat: Joi.alternatives().when('in', {
    is: 'body',
    otherwise: Joi.string().valid(['csv', 'ssv', 'tsv', 'pipes', 'multi']).default('csv').optional()
  }),
  default: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.any().optional() }),
  maximum: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().optional() }),
  exclusiveMaximum: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.boolean().optional() }),
  minimum: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().optional() }),
  exclusiveMinimum: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.boolean().optional() }),
  maxLength: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().integer().optional() }),
  minLength: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().integer().optional() }),
  pattern: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.string().optional() }),
  maxItems: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().integer().optional() }),
  minItems: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().integer().optional() }),
  uniqueItems: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.boolean().optional() }),
  enum: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.any().optional() }),
  multipleOf: Joi.alternatives().when('in', { is: 'body', otherwise: Joi.number().optional() })
}).meta({
  className: 'Parameter'
})

schemas.Response = Joi.object({
  description: Joi.string().allow('').optional(),
  schema: Joi.alternatives().try(schemas.Reference, schemas.Property).optional(),
  // posible but will not be generated (yet)
  headers: Joi.any().optional(),
  examples: Joi.any().optional()
}).meta({
  className: 'Response'
})

schemas.Responses = Joi.object({
  default: schemas.Response.required() // optional in swagger ui
}).pattern(/^[0-9]{3}$/, schemas.Response).meta({
  className: 'Responses'
})

schemas.Operation = Joi.object({
  tags: arrayOfStrings.optional(),
  summary: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  externalDocs: schemas.ExternalDocs.optional(),
  operationId: Joi.string().optional(),
  consumes: arrayOfStrings.optional(),
  produces: arrayOfStrings.optional(),
  parameters: Joi.array().items(schemas.Parameter).optional(),
  responses: schemas.Responses.required(),
  schemes: arrayOfStrings.optional(),
  deprecated: Joi.boolean().optional(),
  security: Joi.any()
}).pattern(/^x-[A-Za-z]*-?[A-Za-z]*/, Joi.string().optional()).meta({
  className: 'Operation'
})

schemas.Path = Joi.object({
  get: schemas.Operation.optional(),
  put: schemas.Operation.optional(),
  post: schemas.Operation.optional(),
  delete: schemas.Operation.optional(),
  options: schemas.Operation.optional(),
  head: schemas.Operation.optional(),
  patch: schemas.Operation.optional(),
  parameters: Joi.array().items(schemas.Parameter).optional()
}).meta({
  className: 'Path'
})

schemas.Definition = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  type: dataTypes.optional(),
  required: Joi.array().items(Joi.string()),
  properties: Joi.object({}).pattern(/.*/, Joi.alternatives().try(schemas.Reference, schemas.Property)),
  default: Joi.any().optional(),
  items: Joi.alternatives().try(schemas.SimpleReference, schemas.Item).optional(),
  format: dataFormat.optional(),
  collectionFormat: Joi.string().optional(),

  // For schema integration tests:
  allOf: Joi.array().items(schemas.Reference).optional()

/*
,anyOf: Joi.array().items(schemas.Reference).optional(),
oneOf: Joi.array().items(schemas.Reference).optional(),
multipleOf: Joi.number().optional(),
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
externalDocs: schemas.ExternalDocs.optional(),
example: Joi.any().optional(),
readOnly: Joi.boolean().optional()
*/
}).meta({ className: 'Definition' })

// Meta-Information
schemas.Contact = Joi.object({
  name: Joi.string().optional(),
  url: Joi.string().optional(),
  email: Joi.string().optional()
}).meta({
  className: 'Contact'
})

schemas.License = Joi.object({
  name: Joi.string().required(),
  url: Joi.string().optional()
}).meta({
  className: 'License'
})

schemas.Info = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  termsOfService: Joi.string().optional(),
  contact: schemas.Contact.optional(),
  license: schemas.License.optional(),
  version: Joi.string().required()
}).meta({
  className: 'Info'
})

schemas.Tag = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  externalDocs: schemas.ExternalDocs.optional()
}).meta({
  className: 'Tag'
})

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
  // parameters: Joi.array().items(schemas.Parameter, schemas.Reference).optional()
  // responses: schemas.Responses,
  tags: Joi.array().items(schemas.Tag).optional(),
  externalDocs: schemas.ExternalDocs.optional(),
  securityDefinitions: Joi.any().optional()
}).meta({
  className: 'Swagger'
})

// Plugin options
schemas.TaggingOptions = Joi.object({
  mode: Joi.string().valid('path', 'tags'),
  pathLevel: Joi.number().integer().min(1).optional(),
  stripRequiredTags: Joi.boolean().optional(),
  stripAdditionalTags: arrayOfStrings.optional()
})

schemas.PluginOptions = Joi.object({
  requiredTags: arrayOfStrings.optional(),
  produces: arrayOfStrings.optional(),
  consumes: arrayOfStrings.optional(),
  endpoint: Joi.string().optional(),
  routeTags: Joi.array().items(Joi.string()).optional(),
  stripPrefix: Joi.string().optional(),
  basePath: Joi.string().optional(),
  responseValidation: Joi.boolean().optional(),
  supportedMethods: Joi.array().items(Joi.string().valid(['get', 'put', 'post', 'delete', 'options', 'head', 'patch'])).optional(),
  tagging: schemas.TaggingOptions.optional(),
  cache: Joi.any().optional(),
  tags: Joi.alternatives().try(Joi.object().pattern(/.*/, Joi.string()), Joi.array().items(schemas.Tag)),
  info: schemas.Info,
  securityDefinitions: Joi.any().optional(),
  host: Joi.string().optional(),
  schemes: Joi.array().items(Joi.string().valid(['http', 'https', 'ws', 'wss'])).optional(),
  auth: Joi.alternatives([
    Joi.string(),
    Joi.object({
      mode: Joi.string().valid('required', 'optional', 'try'),
      scope: Joi.alternatives([
        Joi.string(),
        Joi.array()
      ])
        .allow(false),
      entity: Joi.string().valid('user', 'app', 'any'),
      strategy: Joi.string(),
      strategies: Joi.array().min(1),
      payload: [
        Joi.string().valid('required', 'optional'),
        Joi.boolean()
      ]
    })
  ]).allow(false),
  cors: Joi.alternatives().try(Joi.boolean(), Joi.object({
    origin: arrayOfStrings.optional(),
    matchOrigin: Joi.boolean().optional(),
    isOriginExposed: Joi.boolean().optional(),
    maxAge: Joi.number().integer().optional(),
    headers: arrayOfStrings.optional(),
    additionalHeaders: arrayOfStrings.optional(),
    methods: arrayOfStrings.optional(),
    additionlMethods: arrayOfStrings.optional(),
    exposedHeaders: arrayOfStrings.optional(),
    additionalExposedHeaders: arrayOfStrings.optional(),
    credentials: Joi.boolean().optional(),
    override: Joi.boolean().optional()
  }).min(1)),
  routeConfig: Joi.object().optional()
})

schemas.RoutesPluginOptions = Joi.object({
  produces: arrayOfStrings,
  responses: Joi.object().pattern(/^(default|[0-9]{3})$/, Joi.object({
    type: dataTypes.optional(),
    description: Joi.string().required(),
    schema: Joi.object().optional()
  })),
  custom: Joi.object().pattern(/^x-[A-Za-z]*-?[A-Za-z]*/, Joi.string().required()),
  operationId: Joi.string().optional(),
  security: Joi.any().optional()
}).optional()
