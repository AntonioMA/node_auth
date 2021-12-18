
// To make this easy, just use whatever gets read from the persistent configuration as a parameter
// That way we can change what we expect changing only this module.
function Authenticators(callbackBaseURL, persistConfig, DB, aLogLevel) {

  const SwaggerBP = require('swagger-boilerplate');
  const {
    Utils,
    ErrorInfo,
  } = SwaggerBP;
  const C = require('./serverConstants');
  const { sanitizeId, MultiLevelLogger } = Utils;

  const passport = require('passport');
  const passportAuthenticators = {};
  const passportInitialize = passport.initialize();
  const logger = new MultiLevelLogger('authenticators', aLogLevel);
  let configuredAuthenticators = [];

  const passportCallbacks = {};

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => done(null, id));

  const restrictToPaths = {
  };

  // To add a new provider, add the parser here, and add the strategy below
  const defaultParser = (aRawProfile) => {
    logger.trace('defaultParser:', JSON.stringify(aRawProfile));
    let email =
      aRawProfile.emails && aRawProfile.emails[0] && aRawProfile.emails[0].value;
    email = sanitizeId(email);
    return {
      email,
      id: aRawProfile.id,
      displayName: aRawProfile.displayName,
      name: aRawProfile.name,
      photos: aRawProfile.photos,
      provider: aRawProfile.provider,
    };
  };

  const o365Parser = aRawProfile => ({
    email: sanitizeId(aRawProfile.upn),
    id: aRawProfile.upn,
    displayName: aRawProfile.displayName || aRawProfile.name &&
      ['givenName', 'familyName'].map(k => aRawProfile.name[k] || '').join(' '),
    photos: [],
    provider: aRawProfile.provider,
  });

  const profileParsers = {
    default: defaultParser,
    facebook(aRawProfile) {
      const result = defaultParser(aRawProfile);
      result.displayName = aRawProfile.name.givenName + ' ' +
                           (aRawProfile.name.middleName ? aRawProfile.name.middleName + ' ' : '') +
                           aRawProfile.name.familyName;
      return result;
    },
    ie_o365: o365Parser,
    ie_o365_s: o365Parser,
    gueststudent(aRawProfile) {
      const result = defaultParser(aRawProfile);
      result.isGuest = true;
      result.country = aRawProfile.country;
      return result;
    },
  };

  const getUUIDForProfile = (provName, aProfile) => {
    logger.trace('getUUIDForProfile:', [provName, aProfile]);
    aProfile.provider = aProfile.provider || provName;
    const parsedProfile =
     (profileParsers[aProfile.provider] || profileParsers.default)(aProfile);
    logger.trace('getUUIDForProfile parsedProfile:', parsedProfile);
    return DB.getAuthUserForProfile(parsedProfile);
  };

  const AUTH_CONFIG_TEMPLATE = {
    strategy: {},
    authenticateOptions: {},
  };

  // General strategy callback method
  const STRATEGY_CB =
    (prv, acTok, refTok, prof, done) =>
      getUUIDForProfile(prv, prof).
      then(aUserInfo => done(!aUserInfo && 'UNKNOWN_USER', aUserInfo));

  const ISS_PROF_ST_CB = (prv, issuer, prof, done) => {
    logger.trace('ISS_PROF_ST_CB: ', [prv, issuer, prof]);
    return STRATEGY_CB(prv, null, null, prof, done);
  }

  const REQ_DONE_ST_CB = (prv, req, done) => {
    logger.trace('REQ_DONE_ST_CB:', req.body);
    if (!req.body || !req.body.name) {
      return (done(null, false, {}));
    }
    const { name, country } = req.body;
    const fakeMail = DB.getGuestFakeMail();
    const id = fakeMail;
    const prof = {
      name,
      id,
      country,
      displayName: name,
      emails: [{ value: fakeMail }],
      photos: [],
    };
    return STRATEGY_CB(prv, null, null, prof, done);
  };
  const STRATEGIES_CB = {
    'req,done': REQ_DONE_ST_CB,
    'acTok,refTok,prof,done': STRATEGY_CB,
    'iss,prof,done': ISS_PROF_ST_CB,
    default: STRATEGY_CB,
  };

  const toArray = e => Array.isArray(e) && e || (e !== null && e !== undefined && [e] || e);

  function init() {
    const authenticators = persistConfig[C.AUTHENTICATOR_PROVIDERS].split(',');
    const promises = [];
    authenticators.forEach((aProvider) => {
      promises.push(DB.findOneAuthenticator(aProvider).then((authConfig) => {
        logger.log('Configuring auth provider:', aProvider);
        if (!authConfig || !Utils.isA(AUTH_CONFIG_TEMPLATE, authConfig)) {
          logger.warn(
            'Valid authenticator config not found for', aProvider,
            ', ignoring it!. Invalid:', !authConfig);
          return null;
        }
        const { strategy, authenticateOptions } = authConfig;
        delete authConfig.strategy;
        delete authConfig.authenticateOptions;
        const Strategy = (require(strategy.module))[strategy.object];
        authConfig.callbackURL = callbackBaseURL.replace(':provider', aProvider);
        authConfig.redirectUrl = persistConfig[C.BASE_URL] + authConfig.callbackURL;
        logger.trace('init: Set redirectURL to: ', authConfig.redirectUrl);
        const strategyCb = (STRATEGIES_CB[strategy.callbackParams] || STRATEGIES_CB.default).
          bind(undefined, aProvider);
        const stObject = authConfig.noConstructorOptions && new Strategy(strategyCb) ||
          new Strategy(authConfig, strategyCb);
        passport.use(aProvider, stObject);
        passportAuthenticators[aProvider] = passport.authenticate(aProvider, authenticateOptions);
        passportCallbacks[aProvider] =
          passport.authenticate(aProvider, { failureRedirect: '/index.html' });
        restrictToPaths[aProvider] = toArray(strategy.restrictToPaths);
        return aProvider;
      }).catch((e) => {
        logger.warn('Error adding provider:', aProvider, ':', e);
        return null;
      })
      );
    });
    Promise.all(promises).then(providers => providers.reduce(
      (accumulated, current) => (current && accumulated.push(current) && false) || accumulated,
      []
    )
    ).then((aValidProviders) => {
      configuredAuthenticators = aValidProviders;
      if (configuredAuthenticators.length === 0) {
        throw new Error('FATAL: There are no valid authenticators configured');
      }
    });
    Promise.all(promises).then(providers => logger.log('init configured providers:', providers));
  }

  function auth(aProvider, aPath, aReq, aRes, aNext) {
    logger.trace('auth: ', [aPath, aProvider, aReq.user]);
    // I need the provider, which should be the :provider param...
    const provider = aReq.params && aReq.params.provider;
    if (!provider || !passportAuthenticators[provider]) {
      logger.error('passportAuth: Unknown provider:', provider);
      return aRes.status(403).send(new ErrorInfo(4003, 'Unknown provider'));
    }
    return passportInitialize(aReq, aRes, () =>
      passportAuthenticators[provider](aReq, aRes, aNext));
  }

  function callback(aProvider, aPath, aReq, aRes, aNext) {
    logger.trace('callback:', [aPath, aReq.user]);
    if (aReq.user) {
      return aNext();
    }
    // I need the provider, which should be the :provider param...
    const provider = aReq.params && aReq.params.provider;
    if (!provider || !passportAuthenticators[provider]) {
      logger.error('passportCallback: Unknown provider:', provider);
      return aRes.status(403).send(new ErrorInfo(4003, 'Unknown provider'));
    }
    return passportInitialize(aReq, aRes, () => passportCallbacks[provider](aReq, aRes, aNext));
  }

  // Nifty trick to make the authenticator list depend on the url being authenticated
  const getProviders = aReturnTo => configuredAuthenticators.filter(
    prv => !restrictToPaths[prv] || restrictToPaths[prv].some(rp => aReturnTo.match(rp)));

  init();
  return {
    getProviders,
    auth,
    callback,
  };

}


module.exports = Authenticators;
