var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var Code = require('code');
var expect = Code.expect;
var Joi = require('joi');
//var _ = require('lodash');
//var sinon = require('sinon');
var Hoek = require('hoek');

//var resources = require('../lib/resources');
//var utils = require('../lib/utils');
var generator = require('../lib/generator');
var schemas = require('../lib/schema');

var helper = {
    testDefinition: function(schema, definition, definitions) {
        var definitionResults = definitions || {};
        var desc = generator.fromJoiSchema(schema, definitionResults);
        expect(desc).to.exist;
        Joi.assert(definitionResults, Joi.object({}).pattern(/.*/, schemas.Definition));
        expect(definitionResults).to.deep.equal(definition);
    }
};

describe('definitions', function() {
    describe('simple', function() {
        it('simple schema', function(done) {
            var schema = Joi.object({
                name: Joi.string().required()
            }).options({
                className: 'Pet'
            });

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
            };

            helper.testDefinition(schema, result);
            done();
        });


        it('extended', function(done) {
            var schema = Joi.object({
                huntingSkill: Joi.string().default('lazy').description('The measured skill for hunting').valid('clueless', 'lazy', 'adventerous', 'aggressive'),
                packSize: Joi.number().integer().default(0).min(0).max(10).description('the size of the pack the dog is from').options({format: 'int32'})
            }).options({
                className: 'Pet1'
            });

            var result = {
                'Pet1': {
                    'required': [],
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
            };

            helper.testDefinition(schema, result);
            done();
        });

        it('multiple properties', function(done) {
            var schema = Joi.object({
                booleanValue: Joi.boolean(),
                byteValue: Joi.string().options({format: 'byte'}),
                dateTimeValue: Joi.string().options({format: 'date-time'}),
                numberValue: Joi.number(),
                integerValue: Joi.number().integer(),
                int32Value: Joi.number().integer().options({format: 'int32'}),
                int64Value: Joi.number().integer().options({format: 'int64'}),
                stringValue: Joi.string(),
                booleanArrayValue: Joi.array().includes(Joi.boolean()),
                byteArrayValue: Joi.array().includes(Joi.string().options({format: 'byte'})),
                dateTimeArrayValue: Joi.array().includes(Joi.string().options({format: 'date-time'})),
                int32ArrayValue: Joi.array().includes(Joi.number().integer().options({format: 'int32'})),
                int64ArrayValue: Joi.array().includes(Joi.number().integer().options({format: 'int64'})),
                stringArrayValue: Joi.array().includes(Joi.string())
            }).options({
                className: 'Pet'
            }).description('true');

            var result = {
                Pet: {
                    'required': [],
                    //'description': 'true',
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
            };
            helper.testDefinition(schema, result);
            done();
        });
    });

    describe('array', function() {
        it('simple type', function(done) {
            var schema = Joi.object({
                id: Joi.number().integer().options({
                    format: 'int64'
                }).required(),
                childrensAges: Joi.array().includes(Joi.number().integer().options({
                    format: 'int32'
                }))
            }).options({
                className: 'Array'
            });

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
            };

            helper.testDefinition(schema, result);
            done();
        });

        it('no inclusion type', function(done) {
            var schema = Joi.object({
                id: Joi.number().integer().options({
                    format: 'int64'
                }).required(),
                childrensAges: Joi.array()
            }).options({
                className: 'Array'
            });

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
                            'type': 'array'
                        }
                    }
                }
            };

            helper.testDefinition(schema, result);
            done();
        });

        it('ref', function(done) {
            var schema = Joi.object({
                id: Joi.number().integer().options({
                    format: 'int64'
                }).required(),
                children: Joi.array().includes(Joi.object({
                    name: Joi.string().required()
                }).options({className: 'Person'}))
            }).options({
                className: 'Array'
            });

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
                                '$ref': 'Person'
                            }
                        }
                    }
                }
            };

            helper.testDefinition(schema, result);
            done();
        });
    });

    describe('specials', function() {
        it('name through options.className', function(done) {
            var definitions = {};
            var schema = Joi.object({
                name: Joi.string().required()
            }).options({
                className: 'Pet123'
            });

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
            };

            helper.testDefinition(schema, result, definitions);
            done();
        });

        it('duplicate models', function(done) {
            var definitions = {
                Pet: {}
            };

            var schema = Joi.object({
                name: Joi.string().required()
            }).options({
                className: 'Pet'
            });

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
            };

            helper.testDefinition(schema, result, definitions);
            done();
        });

        it('name from schema', function(done) {
            var schema = Joi.object({
                name: Joi.string().required()
            });

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
            };

            helper.testDefinition(schema, result);
            done();
        });

        it('swaggerType', function(done) {
            var schema = Joi.object({
                name: Joi.any().options({ swaggerType: 'test' })
            });

            var result = {
                'NameModel': {
                    'required': [],
                    'properties': {
                        'name': {
                            'type': 'test'
                        }
                    }
                }
            };

            helper.testDefinition(schema, result);
            done();
        });
    });
});
