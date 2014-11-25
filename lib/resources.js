var _ = require('lodash');
var data = require('../test/specs-v2.0-examples/spec.json');
var utils = require('./utils');
var Hoek = require('hoek');
var generator = require('./generator');

module.exports = function(settings, routes, tags) {
	routes = utils.filterRoutesByRequiredTags(routes, settings.requiredTags);

	if (settings.stripPrefix) {
		routes = utils.stripRoutesPrefix(routes, settings.stripPrefix);
	}

	var parsedTags = utils.parseTags(tags);

	if (parsedTags) {
		routes = utils.filterRoutesByTagSelection(routes, parsedTags.included, parsedTags.excluded);
	}

	routes = _.sortBy(routes, 'path');

	var routesByPath = utils.groupRoutesByPath(routes);
	var definitions = {};

	var paths = _.reduce(routesByPath, function(pathsMemo, routes, path) {
		var operations = _.reduce(routes, function(operationsMemo, route) {
			Hoek.assert(route.method, 'Really? No HTTP Method?');

			var parameters = [];
			var responseTypeExtension = {
				responses: {
					default: {}
				}
			};
			var response = Hoek.reach(route, 'settings.response.schema');
			var query = Hoek.reach(route, 'settings.validate.query');
			var params = Hoek.reach(route, 'settings.validate.params');
			var payload = Hoek.reach(route, 'settings.validate.payload');

			if (params) {
				var paramsSwagger = generator.createProperties(params, null, definitions);
				var paramsProperties = _.map(paramsSwagger, function(property, key) {
					property.name = key;
					property.in = 'path';
					return property;
				});

				parameters = parameters.concat(paramsProperties);
			}

			if (query) {
				var querySwagger = generator.createProperties(query, null, definitions);
				var queryProperties = _.map(querySwagger, function(property, key) {
					property.name = key;
					property.in = 'query';
					return property;
				});

				parameters = parameters.concat(queryProperties);
			}

			if (payload) {
				var allowedMimeType = Hoek.reach(route, 'settings.payload.allow');
				if (_.contains(allowedMimeType, 'application/x-www-form-urlencoded') || _.contains(allowedMimeType, 'multipart/form-data')) {
					// deal with form payloads
					var formSwagger = generator.createProperties(payload, null, definitions);
					var formProperties = _.map(formSwagger, function(property, key) {
						property.name = key;
						property.in = 'form';
						return property;
					});

					parameters = parameters.concat(formProperties);
					responseTypeExtension.consumes = allowedMimeType;
				} else {
					// default to json payload
					var payloadSwagger = generator.fromJoiSchema(payload, null, definitions);
					payloadSwagger.name = payloadSwagger.$ref;
					payloadSwagger.in = 'body';
					payloadSwagger.schema = { $ref: '#/definitions/' + payloadSwagger.$ref };
					delete payloadSwagger.$ref;

					parameters = parameters.concat(payloadSwagger);
					responseTypeExtension.consumes = settings.consumes;
				}

				utils.setNotEmpty(responseTypeExtension, 'consumes', allowedMimeType);
			}

			if (response) {
				var responseSwagger = generator.fromJoiSchema(response, null, definitions);
				utils.setNotEmpty(responseTypeExtension, 'type', responseSwagger.type);
				utils.setNotEmpty(responseTypeExtension, 'items', responseSwagger.items);
				responseTypeExtension.produces = settings.produces;
			}

			var baseOperation = {
				//nickname: utils.generateRouteNickname(route),
			};

			var tags = Hoek.reach(route, 'settings.tags');
            utils.setNotEmpty(baseOperation, 'tags', tags);
			utils.setNotEmpty(baseOperation, 'parameters', parameters);
			utils.setNotEmpty(baseOperation, 'summary', Hoek.reach(route, 'settings.description'));
			utils.setNotEmpty(baseOperation, 'notes', Hoek.reach(route, 'settings.notes'));

			if (_.contains(tags, 'deprecated')) {
				baseOperation.deprecated = true;
			}

			operationsMemo[route.method] = Hoek.merge(baseOperation, responseTypeExtension);
			return operationsMemo;
		}, {});

		if (!_.isEmpty(operations)) {
			pathsMemo[path] = operations;
		}

		return pathsMemo;
	}, {});

	return {
		paths: paths,
		definitions: definitions
	}
};
