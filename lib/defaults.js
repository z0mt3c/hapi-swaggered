module.exports = {
  requiredTags: ['api'],
  produces: ['application/json'],
  consumes: ['application/json'],
  endpoint: '/swagger',
  routeTags: ['swagger'],
  supportedMethods: ['get', 'put', 'post', 'delete', 'patch'],
  responseValidation: false,
  cache: {
    expiresIn: 15 * 60 * 1000
  },
  tagging: {
    mode: 'path',
    pathLevel: 1,
    stripRequiredTags: true
  }
}
