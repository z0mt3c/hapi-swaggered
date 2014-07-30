# hapi-swaggered

## TODO
* Proper(more strict) filter for apis and routes
* Find a way to support authorizations
* Descriptions & infos based on server?
* Response messages & codes
* Support "deprecated"
* Check produces and consumes for proper behavior
* Write tests
* Base path support (overall prefix e.g. api)
* support property format (https://github.com/wordnik/swagger-spec/blob/master/versions/1.2.md#431-primitives)
* file upload?
* Setup hapi-swagger-ui project sharing endpoints and stuff through plugin.expose

What else?


## Example Configuration

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
