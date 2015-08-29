module.exports = {
  requiredTags: ['api'],
  produces: ['application/json'],
  consumes: ['application/json'],
  cors: false,
  endpoint: '/swagger',
  routeTags: ['swagger'],
  supportedMethods: ['get', 'put', 'post', 'delete', 'patch'],
  responseValidation: false,
  cache: {
    expiresIn: 15 * 60 * 1000,
    generateTimeout: 2000
  },
  tagging: {
    mode: 'path',
    pathLevel: 1,
    stripRequiredTags: true,
    stripAdditionalTags: []
  }
}
