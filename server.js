const { Server } = require('swagger-boilerplate');
const path = require('path');

const server =
 new Server({
    apiFile: './api.yml',
    modulePath: path.join(__dirname, 'server') + '/',
    allowedCORSOrigins: process.env.ALLOWED_CORS_ORIGINS || '*',
    appName: 'Node Auth Using PassportJS',
  });

server.start();
