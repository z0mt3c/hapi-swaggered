var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;
var Joi = require('joi');
var Wreck = require('wreck');

var schema = require('../lib/schema-v2');

describe('Schema integration test against official petstore', function () {
	it('petstore-simple', function (done) {
		Joi.assert(require('./specs-v2.0-examples/petstore-simple.json'), schema.Swagger);
		done();
	});

	it('petstore-expanded', function (done) {
		Joi.assert(require('./specs-v2.0-examples/petstore-expanded.json'), schema.Swagger);
		done();
	});

	it('petstore', function (done) {
		Joi.assert(require('./specs-v2.0-examples/petstore.json'), schema.Swagger);
		done();
	});

	it('Parameter', function (done) {
		Joi.assert({
			"name": "tags",
			"in": "query",
			"description": "tags to filter by",
			"required": false,
			"type": "array",
			"items": {
				"type": "string"
			},
			"collectionFormat": "csv"
		}, schema.Parameter);
		done();
	});
});
