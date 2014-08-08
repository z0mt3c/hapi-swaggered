# hapi-swaggered
Yet another hapi plugin providing swagger compliant API specifications based on routes and joi schemas to be used with swagger-ui. 

[![Build Status](https://travis-ci.org/z0mt3c/hapi-swaggered.png)](https://travis-ci.org/z0mt3c/hapi-swaggered)
[![Dependency Status](https://gemnasium.com/z0mt3c/hapi-swaggered.png)](https://gemnasium.com/z0mt3c/hapi-swaggered)


## Swagger-UI
This plugin does not include a [swagger-ui](https://github.com/wordnik/swagger-ui) interface. It just serves the bare swagger 1.2 compliant json feed. 
Looking for an easy swagger-ui plugin to drop-in? Have a look at: [hapi-swaggered-ui](https://github.com/z0mt3c/hapi-swaggered-ui)!
 
## Install
Through npm...

```bash
npm install hapi-swaggered --save
```

## Example Configuration
Swagger ui should be configured to use /api2/swagger2 in this example ;-)

```js
'hapi-swaggered': [
    {
        select: 'api',
        route: {
            prefix: '/api2'
        },
        options: {
            // requiredTags have to be present for all routes exposed through hapi-swaggered
            requiredTags: ['api'],
            produces: [ 'application/json' ],
            consumes: [ 'application/json' ],
            apiVersion: require('./package.json').version,
            endpoint: '/swagger',
            routeTags: ['swagger'],
            // responseValidation for hapi-swaggered routes
            responseValidation: false,
            cache: {
                // default value 15 minutes... hapi caching options
                expiresIn: 15 * 60 * 1000
            },
            descriptions: {
                token: 'Test description'
            },
            info: {
                title: "Title",
                description: "Description",
                termsOfServiceUrl: "http://hapijs.com/",
                contact: "xxx@xxx.com",
                license: "XXX",
                licenseUrl: "http://XXX"
            }
        }
    }
]
```

Overwrite app properties on server level except the route and cache configuration (endpoint, routeTags, cache, responseValidation)! e.g.:

```js
servers: [
    {
        port: 8000,
        options: {
            labels: ['api'],
            app: {
                swagger: {
                    stripPrefix: '/api',
                    descriptions: {
                        'dev': 'description',
                        'null': 'overwritten'
                    },
                    info: {
                        title: "Overwritten",
                        description: "Description",
                        termsOfServiceUrl: "http://hapijs.com/",
                        contact: "xxx@xxx.com",
                        license: "XXX",
                        licenseUrl: "http://XXX"
                    }
                }
            }
        }
    }
],
```

## Examples
### Forms & file-upload
```js 
plugin.route({
    method: 'POST',
    path: '/test/fileUpload',
    config: {
        tags: ['api'],
        validate: {
            payload: Joi.object().keys({ name: Joi.string(), file: Joi.any().options({ swaggerType: 'file' }) })
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

## Topics
### TODO
* proper tag filtering for apiListings
* Check produces and consumes for proper behavior
* Response messages & codes
* Find a way to support authorizations
* Support property format e.g. int64/int32 but i didn't see any ui impact yet? (https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#431-primitives)
* Remove attributes from shema which don't fit to the swagger specifications but it's wired? May not? look for // TODO: remove!
* custom api sorting?

Anything else? Ideas and pull requests are welcome ;-)

### Maybe later
* ~~Improve path variable handling / mapping to swagger~~ not possible due to swagger sepcs
** https://github.com/wordnik/swagger-spec/issues/93

### Completed
* ~~Proper(more strict) filter for apis and routes~~
* ~~handle model name collisions: if equal same name otherwise new type!~~
* ~~Write tests~~
* ~~Descriptions & infos based on server?~~
* ~~Support "deprecated"~~ through route tag deprecated
* ~~Write tests for index.js~~
* ~~cache apiDeclaration and apiListing through plugin methods~~
* ~~'file' upload? (forms)~~
* ~~Setup hapi-swagger-ui project sharing endpoints and stuff through plugin.expose~~
* ~~Base path support (overall prefix e.g. api)~~
* ~~Support Joi.any()~~ currently only partial... e.g. options({ swaggerType: 'file' }) any other requirements?
