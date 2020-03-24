'use strict'

const Lab = require('lab')
const lab = exports.lab = Lab.script()

const describe = lab.experiment
const it = lab.test
const Code = require('code')
const expect = Code.expect
const Joi = require('joi')
// var _ = require('lodash')
// var Hoek = require('hoek')

// var resources = require('../lib/resources')
// var utils = require('../lib/utils')
const generator = require('../lib/generator')
const schemas = require('../lib/schema')

const helper = {
  testDefinition (schema, definition, definitions) {
    const definitionResults = definitions || {}
    const desc = generator.fromJoiSchema(schema, definitionResults)
    expect(desc).to.exist()
    Joi.assert(definitionResults, Joi.object({}).pattern(/.*/, schemas.Definition))
    expect(definitionResults).to.equal(definition)
  }
}

describe('definitions', () => {
  describe('newModel', () => {
    it('object', () => {
      const definitions = {}
      const reference = generator.newModel(Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      }), definitions)

      expect(reference).to.include({ $ref: '#/definitions/Pet' })
      expect(definitions.Pet).to.exist()
      expect(definitions.Pet).to.include({
        required: ['name'],
        properties: { name: { type: 'string' } }
      })
    })

    it('array', () => {
      const definitions = {}
      const model = Joi.array().items(Joi.string()).meta({
        className: 'Pet'
      })
      const reference = generator.newModel.bind(this, model, definitions)
      expect(reference).to.throw(Error, 'generator.newModel does not support array schema')
    })

    it('primitive', () => {
      const definitions = {}
      const reference = generator.newModel(Joi.string(), definitions)
      expect(reference).to.include({ type: 'string' })
      expect(definitions).to.equal({})
    })
  })

  describe('simple', () => {
    it('simple schema', () => {
      const schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      })

      const result = {
        Pet: {
          properties: {
            name: {
              type: 'string'
            }
          },
          required: [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result)
    })

    it('extended', () => {
      const schema = Joi.object({
        huntingSkill: Joi.string().default('lazy').description('The measured skill for hunting').valid('clueless', 'lazy', 'adventerous', 'aggressive'),
        packName: Joi.string().default('theHounds').min(3).max(20).description('the name of the pack the dog is from'),
        packSize: Joi.number().integer().default(0).min(0).max(10).description('the size of the pack the dog is from').meta({ format: 'int32' })
      }).meta({
        className: 'Pet1'
      })

      const result = {
        Pet1: {
          properties: {
            huntingSkill: {
              type: 'string',
              default: 'lazy',
              description: 'The measured skill for hunting',
              enum: ['clueless', 'lazy', 'adventerous', 'aggressive']
            },
            packName: {
              type: 'string',
              default: 'theHounds',
              description: 'the name of the pack the dog is from',
              minLength: 3,
              maxLength: 20
            },
            packSize: {
              type: 'integer',
              format: 'int32',
              default: 0,
              description: 'the size of the pack the dog is from',
              minimum: 0,
              maximum: 10
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('object max', () => {
      const schema = Joi.object({
        test: Joi.object().max(1),
        test2: Joi.array().items(Joi.object()).max(1)
      }).meta({
        className: 'Pet1'
      })

      const result = {
        EmptyModel: {
          properties: {}
        },
        Pet1: {
          properties: {
            test: {
              $ref: '#/definitions/EmptyModel'
            },
            test2: {
              type: 'array',
              items: {
                $ref: '#/definitions/EmptyModel'
              },
              maximum: 1
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('has model meta-description', () => {
      const schema = Joi.object({
        test: Joi.object().max(1).meta({ description: 'an object' })
      }).meta({ className: 'Pet1', description: 'a pet' })

      const result = {
        EmptyModel: {
          description: 'an object',
          properties: {}
        },
        Pet1: {
          description: 'a pet',
          properties: {
            test: {
              $ref: '#/definitions/EmptyModel'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('has model description', () => {
      const schema = Joi.object({
        test: Joi.object().max(1).description('an object')
      }).description('a pet').meta({ className: 'Pet1' })

      const result = {
        EmptyModel: {
          description: 'an object',
          properties: {}
        },
        Pet1: {
          description: 'a pet',
          properties: {
            test: {
              $ref: '#/definitions/EmptyModel'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('collectionFormat', () => {
      const schema = Joi.object({
        test: Joi.array().items(Joi.object()).meta({ collectionFormat: 'multi' })
      }).meta({
        className: 'Pet1'
      })

      const result = {
        EmptyModel: {
          properties: {}
        },
        Pet1: {
          properties: {
            test: {
              type: 'array',
              items: {
                $ref: '#/definitions/EmptyModel'
              },
              collectionFormat: 'multi'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('multiple properties', () => {
      const schema = Joi.object({
        booleanValue: Joi.boolean(),
        byteValue: Joi.string().meta({ format: 'byte' }),
        dateTimeValue: Joi.string().meta({ format: 'date-time' }),
        numberValue: Joi.number(),
        integerValue: Joi.number().integer(),
        int32Value: Joi.number().integer().meta({ format: 'int32' }),
        int64Value: Joi.number().integer().meta({ format: 'int64' }),
        stringValue: Joi.string(),
        booleanArrayValue: Joi.array().items(Joi.boolean()),
        byteArrayValue: Joi.array().items(Joi.string().meta({ format: 'byte' })),
        dateTimeArrayValue: Joi.array().items(Joi.string().meta({ format: 'date-time' })),
        int32ArrayValue: Joi.array().items(Joi.number().integer().meta({ format: 'int32' })),
        int64ArrayValue: Joi.array().items(Joi.number().integer().meta({ format: 'int64' })),
        stringArrayValue: Joi.array().items(Joi.string())
      }).meta({
        className: 'Pet'
      }).description('true')

      const result = {
        Pet: {
          description: 'true',
          properties: {
            booleanValue: {
              type: 'boolean'
            },
            byteValue: {
              type: 'string',
              format: 'byte'
            },
            dateTimeValue: {
              type: 'string',
              format: 'date-time'
            },
            numberValue: {
              type: 'number'
            },
            integerValue: {
              type: 'integer'
            },
            int32Value: {
              type: 'integer',
              format: 'int32'
            },
            int64Value: {
              type: 'integer',
              format: 'int64'
            },
            stringValue: {
              type: 'string'
            },
            booleanArrayValue: {
              type: 'array',
              items: {
                type: 'boolean'
              }
            },
            byteArrayValue: {
              type: 'array',
              items: {
                type: 'string',
                format: 'byte'
              }
            },
            dateTimeArrayValue: {
              type: 'array',
              items: {
                type: 'string',
                format: 'date-time'
              }
            },
            int32ArrayValue: {
              type: 'array',
              items: {
                type: 'integer',
                format: 'int32'
              }
            },
            int64ArrayValue: {
              type: 'array',
              items: {
                type: 'integer',
                format: 'int64'
              }
            },
            stringArrayValue: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      }
      helper.testDefinition(schema, result)
    })
  })

  describe('array', () => {
    it('simple type', () => {
      const schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        childrensAges: Joi.array().items(Joi.number().integer().meta({
          format: 'int32'
        }))
      }).meta({
        className: 'Array'
      })

      const result = {
        Array: {
          required: [
            'id'
          ],
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            childrensAges: {
              type: 'array',
              items: {
                type: 'integer',
                format: 'int32'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('array of array of primitive', () => {
      const schema = Joi.object({
        dimensions: Joi.array().items(Joi.array().items(Joi.string())).required()
      }).meta({
        className: 'Array'
      })

      const result = {
        Array: {
          required: [
            'dimensions'
          ],
          properties: {
            dimensions: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('array of array of array of complex', () => {
      const schema = Joi.object({
        dimensions: Joi.array().items(Joi.array().items(Joi.array().items(Joi.object({
          name: Joi.string()
        }).meta({ className: 'Child' })))).required()
      }).meta({
        className: 'Array'
      })

      const result = {
        Child: {
          properties: {
            name: {
              type: 'string'
            }
          }
        },
        Array: {
          required: [
            'dimensions'
          ],
          properties: {
            dimensions: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/definitions/Child'
                  }
                }
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('no inclusion type', () => {
      const schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        childrensAges: Joi.array()
      }).meta({
        className: 'Array'
      })

      const result = {
        Array: {
          required: [
            'id'
          ],
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            childrensAges: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('ref', () => {
      const schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        children: Joi.array().items(Joi.object({
          name: Joi.string().required()
        }).meta({ className: 'Person' }))
      }).meta({
        className: 'Array'
      })

      const result = {
        Person: {
          required: ['name'],
          properties: {
            name: {
              type: 'string'
            }
          }
        },
        Array: {
          required: [
            'id'
          ],
          properties: {
            id: {
              type: 'integer',
              format: 'int64'
            },
            children: {
              type: 'array',
              items: {
                $ref: '#/definitions/Person'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })
  })

  describe('specials', () => {
    it('name through options.className', () => {
      const definitions = {}
      const schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet123'
      })

      const result = {
        Pet123: {
          properties: {
            name: {
              type: 'string'
            }
          },
          required: [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result, definitions)
    })

    it('duplicate models', () => {
      const definitions = {
        Pet: {}
      }

      const schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      })

      const result = {
        Pet: {},
        Pet_2: {
          properties: {
            name: {
              type: 'string'
            }
          },
          required: [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result, definitions)
    })

    it('name from schema', () => {
      const schema = Joi.object({
        name: Joi.string().required()
      })

      const result = {
        NameModel: {
          required: [
            'name'
          ],
          properties: {
            name: {
              type: 'string'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('swaggerType: primitive', () => {
      const schema = Joi.object({
        name: Joi.string().meta({ swaggerType: 'test' })
      })

      const result = {
        NameModel: {
          properties: {
            name: {
              type: 'test'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('swaggerType: dates', () => {
      const schema = Joi.object({
        date: Joi.date(),
        dateAsInteger: Joi.date().meta({ swaggerType: 'integer' }),
        stringAsDate: Joi.string().meta({ swaggerType: 'date' }),
        dateAsNumber: Joi.date().meta({ swaggerType: 'number' }),
        dateAsBoolean: Joi.date().meta({ swaggerType: 'boolean' }),
        dateWithFormat: Joi.date().meta({ format: 'date' }),
        dateWithMeta: Joi.date().meta({ swaggerType: 'string', format: 'date' }),
        dateTimeWithMeta: Joi.date().meta({ swaggerType: 'string', format: 'date-time' }),
        dateTimeWithFormat: Joi.date().meta({ format: 'date-time' })
      }).meta({ className: 'Test' })

      const result = {
        Test: {
          properties: {
            date: { type: 'string', format: 'date-time' },
            dateAsInteger: { type: 'integer' },
            stringAsDate: { type: 'date' },
            dateAsNumber: { type: 'number' },
            dateAsBoolean: { type: 'boolean' },
            dateWithFormat: { type: 'string', format: 'date' },
            dateWithMeta: { type: 'string', format: 'date' },
            dateTimeWithMeta: { type: 'string', format: 'date-time' },
            dateTimeWithFormat: { type: 'string', format: 'date-time' }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('swaggerType: complex', () => {
      const schema = Joi.object({
        name: Joi.object().meta({ swaggerType: 'test' })
      })

      const result = {
        NameModel: {
          properties: {
            name: {
              type: 'test'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })

    it('object', () => {
      const definitions = {}
      const reference = generator.newModel(Joi.object({
        name: Joi.string().example('Frog').required()
      }).meta({
        className: 'Pet'
      }).example({ name: 'Cat' }), definitions)

      expect(reference).to.include({ $ref: '#/definitions/Pet' })
      expect(definitions.Pet).to.exist()
      expect(definitions.Pet).to.include({
        required: ['name'],
        properties: { name: { type: 'string', example: 'Frog' } },
        example: { name: 'Cat' }
      })
    })

    it('$ref', () => {
      const schema = Joi.object({
        currentPassword: Joi.string().required().description('current password'),
        newPassword: Joi.string().required().description('new password'),
        confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).description('new password again')
      })

      const result = {
        CurrentPasswordNewPasswordConfirmPasswordModel: {
          required: [
            'currentPassword',
            'newPassword',
            'confirmPassword'
          ],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'current password'
            },
            newPassword: {
              type: 'string',
              description: 'new password'
            },
            confirmPassword: {
              type: 'string',
              description: 'new password again'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
    })
  })
})
