# hapi-swaggered

[![Build Status](https://travis-ci.org/z0mt3c/hapi-swaggered.png)](https://travis-ci.org/z0mt3c/hapi-swaggered)
[![Coverage Status](https://coveralls.io/repos/z0mt3c/hapi-swaggered/badge.png?branch=master)](https://coveralls.io/r/z0mt3c/hapi-swaggered?branch=master)
[![Dependency Status](https://gemnasium.com/z0mt3c/hapi-swaggered.png)](https://gemnasium.com/z0mt3c/hapi-swaggered)


## TODO
* Remove attributes from shema which don't fit to the swagger specifications... look for // TODO: remove!
* ~~Proper(more strict) filter for apis and routes~~
* cache apiDeclaration and apiListing through plugin methods
* Find a way to support authorizations
* Descriptions & infos based on server?
* Response messages & codes
* ~~handle model name collisions: if equal same name otherwise new type!~~
* Support "deprecated"
* Support Joi.any()
* Check produces and consumes for proper behavior
* Write tests
* Base path support (overall prefix e.g. api)
* support property format (https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#431-primitives)
* file upload?
* Setup hapi-swagger-ui project sharing endpoints and stuff through plugin.expose

What else?

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
            endpoint: '/swagger2',
            apiVersion: require('./package.json').version,
            descriptions: {
                token: 'Test description'
            },
            info: {
                title: "Swagger Sample App",
                description: "This is a sample server Petstore server.  You can find out more about Swagger \n    at <a href=\"http://swagger.wordnik.com\">http://swagger.wordnik.com</a> or on irc.freenode.net, #swagger.  For this sample,\n    you can use the api key \"special-key\" to test the authorization filters",
                termsOfServiceUrl: "http://helloreverb.com/terms/",
                contact: "apiteam@wordnik.com",
                license: "Apache 2.0",
                licenseUrl: "http://www.apache.org/licenses/LICENSE-2.0.html"
            }
        }
    }
]
```
