module.exports = {
  requiredTags: ['api'],
  produces: ['application/json'],
  consumes: ['application/json'],
  endpoint: '/swagger',
  routeTags: ['swagger'],
  supportedMethods: ['get', 'put', 'post', 'delete', 'patch'],
  responseValidation: true,
  cache: {
    expiresIn: 15 * 60 * 1000
  }
}
