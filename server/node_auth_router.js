// This file implements the API described in api.yml

// The second argument is only really needed for the unit tests.
function nodeAuthRouter(aLogLevel, aModules) {
  const modules = aModules || {};

  const SwaggerBP = require('swagger-boilerplate');
  const C = require('./serverConstants');

  const {
    Utils,
    ServerPersistence,
    ErrorInfo,
    RestAPI,
  } = SwaggerBP;

  ErrorInfo.prototype = {
    toString: () => JSON.stringify(this),
  };

  const { env } = process;

  const Logger = Utils.MultiLevelLogger;

  const Opentok = modules.Opentok || require('opentok');

  const logger = new Logger('node_auth_router', aLogLevel);

  const connectionString =
    (modules && modules.params && modules.params.persistenceConfig) ||
    env.REDIS_URL || env.REDISTOGO_URL || '';
  const serverPersistence =
    new ServerPersistence(
      C.CONFIG_KEYS, connectionString, aLogLevel, modules,
      C.GLOBAL_PREFIX);

  // Not strictly required, since the sub apis could just require them, but helps if we want to
  // replace or mock any module later on.
  Object.assign(modules, {
    serverPersistence,
    ErrorInfo,
    Logger,
    SwaggerBP,
    C,
    RestAPI,
  });

  let configPromise = null;
  const { promisify } = Utils;
  const DataModel = require('./data_model');
  const DDL = require('./ddl');

  function initialConfig() {
    // This will hold the configuration read from Redis
    return serverPersistence.updateCache().
      then((persistConfig) => {
        const rootPath = persistConfig[C.ROOT_PATH];

        const DB = new DataModel(serverPersistence, aLogLevel, DDL);
        const authenticators =
          (require('./authenticators'))('/login/:provider/callback', persistConfig, DB, aLogLevel);

        return {
          authenticators,
          rootPath,
        };
      });
  }

  function configReady(aReq, aRes, aNext) {
    configPromise.then((config) => {
      aReq.config = config;
      aNext();
    });
  }

  function loadConfig() {
    configPromise = initialConfig();
    return configPromise;
  }

  // Default Error handler
  function errorHandler(aErr, aReq, aRes, aNext) {
    logger.error('errorHandler: ', aReq.path, ':', aErr.stack, ':', aErr);
    if (typeof aRes.status === 'function') {
      return aRes.status(500).render('back.ejs', { error: aErr || 'INTERNAL_ERROR' }, (err, html) => {
        if (err) {
          logger.error('Invalid Template error: ', err);
          aRes.status(500).send(new ErrorInfo(50001, 'Invalid Template'));
        } else {
          aRes.send(html);
        }
      });
    }
    logger.log('errorHandler: cannot answer because aRes is invalid');
    return aNext();
  }

  const LOCAL_METHODS = {
    logger,
    configReady,
    loadConfig,
    errorHandler,
  };
  const PATH_METHODS = [
    'login',
    'user',
  ].map(mod => new (require('./api/' + mod))(aLogLevel, modules));
  PATH_METHODS.push(LOCAL_METHODS);

  return Object.assign.apply(Object, PATH_METHODS);

}

module.exports = nodeAuthRouter;
