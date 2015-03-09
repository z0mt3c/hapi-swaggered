# hapi-swaggered
Yet another hapi plugin providing swagger compliant API specifications based on routes and joi schemas to be used with swagger-ui.

Supports hapi 7.x and 8.x

[![Build Status](https://travis-ci.org/z0mt3c/hapi-swaggered.png)](https://travis-ci.org/z0mt3c/hapi-swaggered)
[![Dependency Status](https://gemnasium.com/z0mt3c/hapi-swaggered.png)](https://gemnasium.com/z0mt3c/hapi-swaggered)
[![Coverage Status](https://coveralls.io/repos/z0mt3c/hapi-swaggered/badge.svg?branch=swagger_2_specs)](https://coveralls.io/r/z0mt3c/hapi-swaggered?branch=swagger_2_specs)

## Install
```bash
npm install hapi-swaggered --save
```
## Similar swagger-projects for hapi
[krakenjs/swaggerize-hapi](https://github.com/krakenjs/swaggerize-hapi) follows a design driven approach (swagger-schema first) for building APIs. In other words: it supports you to implement an api behind a specific swagger-schema while you have to create and maintain the swagger-schema yourself (or a third-party). In contrast with hapi-swaggered you will have to design your api through hapi route defintions and joi schemas (or did already) and hapi-swaggered will generate it's swagger specifications up on that (Of course not as beautiful and shiny structured as done by hand). Based on this you are able to get beautiful hands-on swagger-ui documentation (like [this](http://petstore.swagger.wordnik.com/)) for your api up and running (e.g. through [hapi-swaggered-ui](https://github.com/z0mt3c/hapi-swaggered-ui)).

## Swagger-UI
This plugin does not include the [swagger-ui](https://github.com/wordnik/swagger-ui) interface. It just serves a bare swagger 1.2 (working on 2.0) compliant json feed. If you are looking for an easy swagger-ui plugin to drop-in? Have a look at:
* [hapi-swaggered-ui](https://github.com/z0mt3c/hapi-swaggered-ui)

## Plugin Configuration
* `requiredTags`: an array of strings, only routes with on of the specified tags will be exposed, defaults to: `['api']`
* `produces`: an array of mime type strings, defaults to: `[ 'application/json' ]`
* `consumes`: an array of mime type strings, defaults to: `[ 'application/json' ]`
* `apiVersion`: version string of your api, which will be exposed, defaults to null
* `endpoint`: route path to the swagger specification, defaults to: `'/swagger'`
* `routeTags`: an array of strings, all routes exposed by hapi-swaggered will be tagged as specified, defaults to `['swagger']`
* `stripPrefix`: a path prefix which should be stripped from the swagger specifications. E.g. your root resource are located under `/api/v12345678/resource` you might want to strip `/api/v12345678`, defaults to null
* `responseValidation`: boolean, turn response validation on and off for hapi-swaggered routes, defaults to true
* `host`: string, overwrite requests host (e.g. domain.tld:1337)
* `protocol`: string, overwrite requests schema (e.g. https)
* `cache`: caching options for the swagger schema generation as specified in [`server.method()`](https://github.com/hapijs/hapi/blob/master/docs/Reference.md#servermethodname-fn-options) of hapi, defaults to: `{ expiresIn: 15 * 60 * 1000 }`
* `descriptions`: object for defining root level resource descriptions. E.g. you have endpoints `/get/this` and `/get/that` they will be groupped unter /get and you are able to define a description through this object as `{ 'get': 'get this and that' }`, defaults to null
* `info`: exposed swagger api informations, defaults to null (optional)
  * `title`: string (required)
  * `description`: string (required)
  * `termsOfServiceUrl`: string
  * `contact`: string
  * `license`: string
  * `licenseUrl`: string

## Example (Hapi 8)
Example configuration for hapi-swaggered + hapi-swaggered-ui

```js
var Hapi = require('hapi');
var Joi = require('joi');
var hapiSwaggered = require('hapi-swaggered');
var hapiSwaggeredUi = require('hapi-swaggered-ui');

var server = new Hapi.Server();
server.connection({
    port: 8000,
    labels: ['api']
});

server.register({
    register: hapiSwaggered,
    options: {
        descriptions: {
            'foobar': 'Example foobar description'
        },
        info: {
            title: 'Example API',
            description: 'Tiny hapi-swaggered example'
        }
    }
}, {
    select: 'api',
    routes: {
        prefix: '/swagger'
    }
}, function(err) {
    if (err) {
        throw err;
    }
});

server.register({
    register: hapiSwaggeredUi,
    options: {
        title: 'Example API',
        authorization: {
            field: 'apiKey',
            scope: 'query' // header works as well
            // valuePrefix: 'bearer '// prefix incase
        }
    }
}, {
    select: 'api',
    routes: {
        prefix: '/docs'
    }
}, function(err) {
    if (err) {
        throw err;
    }
});


server.route({
    path: '/',
    method: 'GET',
    handler: function(request, reply) {
        reply.redirect('/docs');
    }
});

server.route({
    path: '/foobar/test',
    method: 'GET',
    config: {
        tags: ['api'],
        description: 'My route description',
        notes: 'My route notes',
        handler: function(request, reply) {
            reply({});
        }
    }
});

server.route({
    path: '/foobar/{foo}/{bar}',
    method: 'GET',
    config: {
        tags: ['api'],
        validate: {
            params: {
                foo: Joi.string().required().description('test'),
                bar: Joi.string().required()
            }
        },
        handler: function(request, reply) {
            reply({});
        }
    }
});

server.start(function() {
    console.log('started on http://localhost:8000');
});
```

## Overwriting configuration on server level (Hapi 8)
Some configurations can be overwritten on connection level:

```js
var Hapi = require('hapi');
var server = new Hapi.Server();
server.connection({
    port: 8000,
    labels: ['api'],
    app: {
        swagger: {
            info: {
                title: 'Example API',
                description: 'Tiny hapi-swaggered example'
            }
        }
    }
});
```

## Features
### Model naming
To assign custom names to your Models use the Joi.meta() option (in previous joi versions Joi.options() may be used)

```js
Joi.object({}).meta({ className: 'FooBar' });
```

### File upload (Hapi 8)
To achieve a file upload your route should look like as follows. (Important parts are the swaggerType in the Joi options as well as the allowed payload)

```js
server.route({
    method: 'POST',
    path: '/test/fileUpload',
    config: {
        tags: ['api'],
        validate: {
            payload: Joi.object().keys({ name: Joi.string(), file: Joi.any().meta({ swaggerType: 'file' }) })
        },
        handler: function (request, reply) {
            // handle file upload as specified in payload.output
            reply({ name: request.payload.name });
        },
        payload: {
            allow: 'multipart/form-data'
            output: 'data'|'stream'|'file'
        }
    }
});
```

### Tag filtering
Routes can be filtered for tags through the tags query parameter beside the requiredTags property which is always required to be present.

For example:

* `?tags=public,beta (equal to ?tags=+public,+beta)`
  * will only show apis and routes with tag public AND/OR beta.
* `?tags=public,-beta (equal to ?tags=+public,-beta)`
  * will only show apis and routes with tag public AND NOT beta.

## Hapi 7 usage
Please have a look at a previous (README)[https://github.com/z0mt3c/hapi-swaggered/blob/feb699f1c2393c466ae29850733877b095673491/README.md].

## Known issues
### No repsonse types
The routes response schemas which hapi-swaggered is parsing will be dropped by hapi whenever the response validation is disabled. In this case hapi-swaggered will not be able to show any response types. A very low sampling rate is sufficient to keep the repsonse types.
