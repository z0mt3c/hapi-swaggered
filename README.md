# hapi-swaggered 3.x
Yet another hapi plugin providing swagger compliant API specifications (swagger specs 2.0) based on routes and joi schemas to be used with swagger-ui.

Supports hapi 17.x and up

For earlier versions check [hapi-swaggered 2.x](https://github.com/z0mt3c/hapi-swaggered/blob/2.x/README.md) (current default/latest `npm install hapi-swaggered --save`)

[![Build Status](https://img.shields.io/travis/z0mt3c/hapi-swaggered/master.svg)](https://travis-ci.org/z0mt3c/hapi-swaggered)
[![Coverage Status](https://img.shields.io/coveralls/z0mt3c/hapi-swaggered/master.svg)](https://coveralls.io/r/z0mt3c/hapi-swaggered?branch=master)
[![Dependency Status](https://img.shields.io/gemnasium/z0mt3c/hapi-swaggered.svg)](https://gemnasium.com/z0mt3c/hapi-swaggered)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![npm downloads](https://img.shields.io/npm/dm/hapi-swaggered.svg)](https://www.npmjs.com/package/hapi-swaggered)

## Install
```bash
npm install hapi-swaggered@next --save
```

## Similar swagger-projects for hapi
[krakenjs/swaggerize-hapi](https://github.com/krakenjs/swaggerize-hapi) follows a design driven approach (swagger-schema first) for building APIs. In other words: it supports you to implement an api behind a specific swagger-schema while you have to create and maintain the swagger-schema yourself (or a third-party). In contrast with hapi-swaggered you will have to design your api through hapi route defintions and joi schemas (or did already) and hapi-swaggered will generate it's swagger specifications up on that (Of course not as beautiful and shiny structured as done by hand). Based on this you are able to get beautiful hands-on swagger-ui documentation (like [this](http://petstore.swagger.io/)) for your api up and running (e.g. through [hapi-swaggered-ui](https://github.com/z0mt3c/hapi-swaggered-ui)).

## Swagger-UI
This plugin does not include the [swagger-ui](https://github.com/wordnik/swagger-ui) interface. It just serves a bare swagger 2.0 compliant json feed. If you are looking for an easy swagger-ui plugin to drop-in? You should have a look at:
* [hapi-swaggered-ui](https://github.com/z0mt3c/hapi-swaggered-ui)

## Plugin Configuration
* `requiredTags`: an array of strings, only routes with all of the specified tags will be exposed, defaults to: `['api']`
* `produces`: an array of mime type strings, defaults to: `[ 'application/json' ]`
* `consumes`: an array of mime type strings, defaults to: `[ 'application/json' ]`
* `endpoint`: route path to the swagger specification, defaults to: `'/swagger'`
* `routeTags`: an array of strings, all routes exposed by hapi-swaggered will be tagged as specified, defaults to `['swagger']`
* `stripPrefix`: a path prefix which should be stripped from the swagger specifications. E.g. your root resource are located under `/api/v12345678/resource` you might want to strip `/api/v12345678`, defaults to null
* `basePath`: string, optional url base path (e.g. used to fix reverse proxy routes)
* `supportedMethods`: array of http methods, only routes with mentioned methods will be exposed, in case of a wildcard * a route will be generated for each method, defaults to `['get', 'put', 'post', 'delete', 'patch']`
* `host`: string, overwrite requests host (e.g. domain.tld:1337)
* `schemes`: array of allowed schemes e.g. `['http', 'https', 'ws', 'wss']` (optional)
* `info`: exposed swagger api informations, defaults to null (optional)
  * `title`: string (required)
  * `description`: string (required)
  * `termsOfService`: string
  * `contact`: object (optional)
    * `name`: string
    * `url`: string
    * `email`: string
  * `license`: object  (optional)
    * `name`: string: string
    * `url`: string: string
  * `version`: version string of your api, which will be exposed (required)
* `tagging`: Options used for grouping routes
  * `mode`: string, can be `path` (routes will be grouped by its path) or `tags` (routes will be grouped by its tags), default is `path`
  * `pathLevel` integer, in case of mode `path` it defines on which level the path grouping will take place (default is 1)
  * `stripRequiredTags` boolean, in case of mode `tags` it defines if the `requiredTags` will not be exposed (default is true)
* `tags`: object (or array with objects according to the [swagger specs](https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md#tagObject)) for defining tag / group descriptions. E.g. you two endpoints `/get/this` and `/get/that` and the tagging mode is set to path (with pathLevel: 1) they will be groupped unter /get and you are able to define a description through this object as `{ 'get': 'get this and that' }`, defaults to null
* `cors`: boolean or object with cors configuration as according to the [hapijs documentation](https://github.com/hapijs/hapi/blob/master/API.md#route-options) (defaults to false)
* `cache`: caching options for the swagger schema generation as specified in [`server.method()`](https://github.com/hapijs/hapi/blob/master/API.md#servermethodname-method-options) of hapi, defaults to: `{ expiresIn: 15 * 60 * 1000 }`
* `responseValidation`: boolean, turn response validation on and off for hapi-swaggered routes, defaults to false
* `auth`: authentication configuration [hapijs documentation](https://github.com/hapijs/hapi/blob/master/API.md#route-options) (default to undefined)

## Example
Example configuration for hapi-swaggered + hapi-swaggered-ui

```js
const Hapi = require('hapi');

const server = Hapi.Server({ port: 8000 });

(async () => {
  await server.register([
    require('inert'),
    require('vision'),
    {
      plugin: require('hapi-swaggered'),
      options: {
        tags: {
          'foobar/test': 'Example foobar description'
        },
        info: {
          title: 'Example API',
          description: 'Powered by node, hapi, joi, hapi-swaggered, hapi-swaggered-ui and swagger-ui',
          version: '1.0'
        }
      }
    },
    {
      plugin: require('hapi-swaggered-ui'),
      options: {
        title: 'Example API',
        path: '/docs',
        authorization: {
          field: 'apiKey',
          scope: 'query', // header works as well
          // valuePrefix: 'bearer '// prefix incase
          defaultValue: 'demoKey',
          placeholder: 'Enter your apiKey here'
        },
        swaggerOptions: {
          validatorUrl: null
        }
      }
    }
  ]);
})();

server.route({
  path: '/',
  method: 'GET',
  handler (request, h) {
    h.redirect('/docs');
  }
});

(async () => {
  await server.start();
  console.log('started on http://localhost:8000')

})();
```

Demo Routes
```js
server.route({
  path: '/foobar/test',
  method: 'GET',
  options: {
    tags: ['api'],
    description: 'My route description',
    notes: 'My route notes',
    handler () {
      return {};
    }
  }
});

server.route({
  path: '/foobar/{foo}/{bar}',
  method: 'GET',
  options: {
    tags: ['api'],
    validate: {
      params: {
        foo: Joi.string().required().description('test'),
        bar: Joi.string().required()
      }
    },
    handler () {
      return {};
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

### Model description
To assign a description to your Models use the Joi.meta() option like above

```js
Joi.object({}).meta({ description: 'A description of FooBar' });
```

### Type naming
To override the type a Joi model should be interpreted as, use the Joi.meta() option like above. This is especially useful when utilizing the extend and coerce features of Joi schema definition

```js
Joi.object({}).meta({ swaggerType: string });
```

### Document responses
There are 2 and a half different ways of documenting responses of routes:

The hapi way:

```js
{
  options: {
    response: {
      schema: Joi.object({
        bar: Joi.string().description('test').required()
      }).description('test'),
      status: {
        500: Joi.object({
          bar: Joi.string().description('test').required()
        })
      }
    }
  }
}
```

The plugin way without schemas:

```js
{
  options: {
    plugins: {
      'hapi-swaggered': {
        responses: {
          default: {description: 'Bad Request'},
          500: {description: 'Internal Server Error'}
        }
      }
    },
    response: {
      schema: Joi.object({
        bar: Joi.string().required()
      }).description('test')
    }
  }
}
```

The plugin way with schemas:

```js
{
  options: {
    plugins: {
      'hapi-swaggered': {
        responses: {
          default: {
            description: 'Bad Request', schema: Joi.object({
              bar: Joi.string().description('test').required()
            })
          },
          500: {description: 'Internal Server Error'}
        }
      }
    }
  }
}
```

Specify an operationId for a route:

```js
{
  options: {
    plugins: {
      'hapi-swaggered': {
        operationId: 'testRoute'
      }
    }
  }
}
```

### Tag filtering
Routes can be filtered for tags through the tags query parameter beside the requiredTags property which is always required to be present.

For example:

* `?tags=public,beta (equal to ?tags=+public,+beta)`
  * will only show apis and routes with tag public AND/OR beta.
* `?tags=public,-beta (equal to ?tags=+public,-beta)`
  * will only show apis and routes with tag public AND NOT beta.

## Known issues
### No response types
The routes response schemas which hapi-swaggered is parsing will be dropped by hapi whenever the response validation is disabled. In this case hapi-swaggered will not be able to show any response types. A very low sampling rate is sufficient to keep the repsonse types.
