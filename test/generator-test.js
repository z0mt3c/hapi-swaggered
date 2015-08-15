var Lab = require('lab')
var lab = exports.lab = Lab.script()

var describe = lab.experiment
var it = lab.test
var Code = require('code')
var expect = Code.expect
var Joi = require('joi')
// var _ = require('lodash')
// var Hoek = require('hoek')

// var resources = require('../lib/resources')
// var utils = require('../lib/utils')
var generator = require('../lib/generator')
var schemas = require('../lib/schema')

var helper = {
  testDefinition: function (schema, definition, definitions) {
    var definitionResults = definitions || {}
    var desc = generator.fromJoiSchema(schema, definitionResults)
    expect(desc).to.exist()
    Joi.assert(definitionResults, Joi.object({}).pattern(/.*/, schemas.Definition))
    expect(definitionResults).to.deep.equal(definition)
  }
}

describe('definitions', function () {
  describe('newModel', function () {
    it('object', function (done) {
      var definitions = {}
      var reference = generator.newModel(Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      }), definitions)

      expect(reference).to.deep.include({'$ref': '#/definitions/Pet'})
      expect(definitions.Pet).to.exist()
      expect(definitions.Pet).to.deep.include({
        required: ['name'],
        properties: {name: {type: 'string'}}
      })

      done()
    })

    it('array', function (done) {
      var definitions = {}
      var model = Joi.array().items(Joi.string()).meta({
        className: 'Pet'
      })
      var reference = generator.newModel.bind(this, model, definitions)
      expect(reference).to.throw(Error, 'generator.newModel does not support array schema')
      done()
    })

    it('primitive', function (done) {
      var definitions = {}
      var reference = generator.newModel(Joi.string(), definitions)
      expect(reference).to.deep.include({'type': 'string'})
      expect(definitions).to.deep.equal({})
      done()
    })
  })

  describe('simple', function () {
    it('simple schema', function (done) {
      var schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      })

      var result = {
        'Pet': {
          'properties': {
            'name': {
              'type': 'string'
            }
          },
          'required': [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('extended', function (done) {
      var schema = Joi.object({
        huntingSkill: Joi.string().default('lazy').description('The measured skill for hunting').valid('clueless', 'lazy', 'adventerous', 'aggressive'),
        packSize: Joi.number().integer().default(0).min(0).max(10).description('the size of the pack the dog is from').meta({format: 'int32'})
      }).meta({
        className: 'Pet1'
      })

      var result = {
        'Pet1': {
          'properties': {
            'huntingSkill': {
              'type': 'string',
              'default': 'lazy',
              'description': 'The measured skill for hunting',
              'enum': ['clueless', 'lazy', 'adventerous', 'aggressive']
            },
            'packSize': {
              'type': 'integer',
              'format': 'int32',
              'default': 0,
              'description': 'the size of the pack the dog is from',
              'minimum': 0,
              'maximum': 10
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('object max', function (done) {
      var schema = Joi.object({
        test: Joi.object().max(1),
        test2: Joi.array().items(Joi.object()).max(1)
      }).meta({
        className: 'Pet1'
      })

      var result = {
        'EmptyModel': {
          'properties': {}
        },
        'Pet1': {
          'properties': {
            'test': {
              '$ref': '#/definitions/EmptyModel'
            },
            'test2': {
              'type': 'array',
              'items': {
                '$ref': '#/definitions/EmptyModel'
              },
              'maximum': 1
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('collectionFormat', function (done) {
      var schema = Joi.object({
        test: Joi.array().items(Joi.object()).meta({collectionFormat: 'multi'})
      }).meta({
        className: 'Pet1'
      })

      var result = {
        'EmptyModel': {
          'properties': {}
        },
        'Pet1': {
          'properties': {
            'test': {
              'type': 'array',
              'items': {
                '$ref': '#/definitions/EmptyModel'
              },
              'collectionFormat': 'multi'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('multiple properties', function (done) {
      var schema = Joi.object({
        booleanValue: Joi.boolean(),
        byteValue: Joi.string().meta({format: 'byte'}),
        dateTimeValue: Joi.string().meta({format: 'date-time'}),
        numberValue: Joi.number(),
        integerValue: Joi.number().integer(),
        int32Value: Joi.number().integer().meta({format: 'int32'}),
        int64Value: Joi.number().integer().meta({format: 'int64'}),
        stringValue: Joi.string(),
        booleanArrayValue: Joi.array().items(Joi.boolean()),
        byteArrayValue: Joi.array().items(Joi.string().meta({format: 'byte'})),
        dateTimeArrayValue: Joi.array().items(Joi.string().meta({format: 'date-time'})),
        int32ArrayValue: Joi.array().items(Joi.number().integer().meta({format: 'int32'})),
        int64ArrayValue: Joi.array().items(Joi.number().integer().meta({format: 'int64'})),
        stringArrayValue: Joi.array().items(Joi.string())
      }).meta({
        className: 'Pet'
      }).description('true')

      var result = {
        Pet: {
          // 'description': 'true',
          'properties': {
            'booleanValue': {
              'type': 'boolean'
            },
            'byteValue': {
              'type': 'string',
              'format': 'byte'
            },
            'dateTimeValue': {
              'type': 'string',
              'format': 'date-time'
            },
            'numberValue': {
              'type': 'number'
            },
            'integerValue': {
              'type': 'integer'
            },
            'int32Value': {
              'type': 'integer',
              'format': 'int32'
            },
            'int64Value': {
              'type': 'integer',
              'format': 'int64'
            },
            'stringValue': {
              'type': 'string'
            },
            'booleanArrayValue': {
              'type': 'array',
              'items': {
                'type': 'boolean'
              }
            },
            'byteArrayValue': {
              'type': 'array',
              'items': {
                'type': 'string',
                'format': 'byte'
              }
            },
            'dateTimeArrayValue': {
              'type': 'array',
              'items': {
                'type': 'string',
                'format': 'date-time'
              }
            },
            'int32ArrayValue': {
              'type': 'array',
              'items': {
                'type': 'integer',
                'format': 'int32'
              }
            },
            'int64ArrayValue': {
              'type': 'array',
              'items': {
                'type': 'integer',
                'format': 'int64'
              }
            },
            'stringArrayValue': {
              'type': 'array',
              'items': {
                'type': 'string'
              }
            }
          }
        }
      }
      helper.testDefinition(schema, result)
      done()
    })
  })

  describe('array', function () {
    it('simple type', function (done) {
      var schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        childrensAges: Joi.array().items(Joi.number().integer().meta({
          format: 'int32'
        }))
      }).meta({
        className: 'Array'
      })

      var result = {
        Array: {
          'required': [
            'id'
          ],
          'properties': {
            'id': {
              'type': 'integer',
              'format': 'int64'
            },
            'childrensAges': {
              'type': 'array',
              'items': {
                'type': 'integer',
                'format': 'int32'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('array of array of primitive', function (done) {
      var schema = Joi.object({
        dimensions: Joi.array().items(Joi.array().items(Joi.string())).required()
      }).meta({
        className: 'Array'
      })

      var result = {
        Array: {
          'required': [
            'dimensions'
          ],
          'properties': {
            'dimensions': {
              'type': 'array',
              'items': {
                'type': 'array',
                'items': {
                  'type': 'string'
                }
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('array of array of array of complex', function (done) {
      var schema = Joi.object({
        dimensions: Joi.array().items(Joi.array().items(Joi.array().items(Joi.object({
          name: Joi.string()
        }).meta({ className: 'Child' })))).required()
      }).meta({
        className: 'Array'
      })

      var result = {
        Child: {
          'properties': {
            'name': {
              'type': 'string'
            }
          }
        },
        Array: {
          'required': [
            'dimensions'
          ],
          'properties': {
            'dimensions': {
              'type': 'array',
              'items': {
                'type': 'array',
                'items': {
                  'type': 'array',
                  'items': {
                    '$ref': '#/definitions/Child'
                  }
                }
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('no inclusion type', function (done) {
      var schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        childrensAges: Joi.array()
      }).meta({
        className: 'Array'
      })

      var result = {
        Array: {
          'required': [
            'id'
          ],
          'properties': {
            'id': {
              'type': 'integer',
              'format': 'int64'
            },
            'childrensAges': {
              'type': 'array',
              'items': {
                'type': 'string'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('ref', function (done) {
      var schema = Joi.object({
        id: Joi.number().integer().meta({
          format: 'int64'
        }).required(),
        children: Joi.array().items(Joi.object({
          name: Joi.string().required()
        }).meta({className: 'Person'}))
      }).meta({
        className: 'Array'
      })

      var result = {
        Person: {
          required: ['name'],
          properties: {
            name: {
              type: 'string'
            }
          }
        },
        Array: {
          'required': [
            'id'
          ],
          'properties': {
            'id': {
              'type': 'integer',
              'format': 'int64'
            },
            'children': {
              'type': 'array',
              'items': {
                '$ref': '#/definitions/Person'
              }
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })
  })

  describe('specials', function () {
    it('name through options.className', function (done) {
      var definitions = {}
      var schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet123'
      })

      var result = {
        'Pet123': {
          'properties': {
            'name': {
              'type': 'string'
            }
          },
          'required': [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result, definitions)
      done()
    })

    it('duplicate models', function (done) {
      var definitions = {
        Pet: {}
      }

      var schema = Joi.object({
        name: Joi.string().required()
      }).meta({
        className: 'Pet'
      })

      var result = {
        'Pet': {},
        'Pet_2': {
          'properties': {
            'name': {
              'type': 'string'
            }
          },
          'required': [
            'name'
          ]
        }
      }

      helper.testDefinition(schema, result, definitions)
      done()
    })

    it('name from schema', function (done) {
      var schema = Joi.object({
        name: Joi.string().required()
      })

      var result = {
        'NameModel': {
          'required': [
            'name'
          ],
          'properties': {
            'name': {
              'type': 'string'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('swaggerType: primitive', function (done) {
      var schema = Joi.object({
        name: Joi.string().meta({swaggerType: 'test'})
      })

      var result = {
        'NameModel': {
          'properties': {
            'name': {
              'type': 'test'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })

    it('swaggerType: dates', function (done) {
      var schema = Joi.object({
        date: Joi.date(),
        dateAsInteger: Joi.date().meta({swaggerType: 'integer'}),
        stringAsDate: Joi.string().meta({swaggerType: 'date'}),
        dateAsNumber: Joi.date().meta({swaggerType: 'number'}),
        dateAsBoolean: Joi.date().meta({swaggerType: 'boolean'}),
        dateWithFormat: Joi.date().meta({format: 'date'}),
        dateWithMeta: Joi.date().meta({swaggerType: 'string', format: 'date'}),
        dateTimeWithMeta: Joi.date().meta({swaggerType: 'string', format: 'date-time'}),
        dateTimeWithFormat: Joi.date().meta({format: 'date-time'})
      }).meta({ className: 'Test' })

      var result = {
        'Test': {
          'properties': {
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
      done()
    })

    it('swaggerType: complex', function (done) {
      var schema = Joi.object({
        name: Joi.object().meta({swaggerType: 'test'})
      })

      var result = {
        'NameModel': {
          'properties': {
            'name': {
              'type': 'test'
            }
          }
        }
      }

      helper.testDefinition(schema, result)
      done()
    })
  })
})
