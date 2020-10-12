// Just to have all the useful constants on a single place.

const path = require('path');

const E = module.exports;
const { env } = process;
const GLOBAL_PREFIX = 'nodeAuth/';

// Global prefix for all the keys defined here (and in general)
E.GLOBAL_PREFIX = GLOBAL_PREFIX;
const PARAMS_CONTAINER = 'Params';
const getParamKey = paramName => [PARAMS_CONTAINER, paramName].join('/');



// Some Redis keys...

// Auth Secret
E.AUTH_SECRET = getParamKey('auth_hmac_secret');

E.AUTHENTICATOR_PROVIDERS = getParamKey('authenticator_providers');

E.BASE_URL = getParamKey('base_url');

E.ROOT_PATH = getParamKey('root_path');

// Note! Warn! Achtung! Aviso! This pretty much sucks... and there's no other way to do it
// without changing the boilerplate. The content dir is not exposed to the module.
const DEF_ROOT_PATH = path.join(__dirname, '../web');

E.CONFIG_KEYS = [
  { key: E.AUTHENTICATOR_PROVIDERS, defaultValue: null },
  { key: E.BASE_URL, defaultValue: env.BASE_URL || 'https://localhost:' + (env.PORT || 8124) },
  { key: E.ROOT_PATH, defaultValue: DEF_ROOT_PATH },
];
