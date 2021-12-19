function Login(aLogLevel, aModules) {
  const urlencodedParser = require('body-parser').urlencoded({ extended: false });
  const {
    ErrorInfo,
    Logger,
  } = aModules;
  const logger = new Logger('Login', aLogLevel);

  function passportAuth(aPath, aReq, aRes, aNext) {
    logger.trace('passportAuth: ', [aPath, aReq.params, aReq.user]);
    const provider = aReq.params && aReq.params.provider;
    aReq.config.authenticators.auth(provider, aPath, aReq, aRes, aNext);
  }

  function passportCallback(aPath, aReq, aRes, aNext) {
    logger.trace('passportCallback: ', [aPath, aReq.params, aReq.user, aReq.query, aReq.body]);
    const provider = aReq.params && aReq.params.provider;
    if (aReq.method.toLowerCase() === 'post') {
      return urlencodedParser(aReq, aRes,
        () => aReq.config.authenticators.callback(provider, aPath, aReq, aRes, aNext)
      );
    }
    return aReq.config.authenticators.callback(provider, aPath, aReq, aRes, aNext);
  }

  function getAuthProviders(aReq, aRes) {
    const { session } = aReq;
    const { returnTo } = session || {};
    logger.trace('getAuthProviders:', [returnTo]);
    aRes.status(200).send(aReq.config.authenticators.getProviders(returnTo || ''));
  }

  // Funnily enough, this method will never be called...
  function getLogin(aReq, aRes) {
    aRes.status(500).send(new ErrorInfo(500, 'INVALID_STATE_LOGIN'));
  }

  function getLoginCallback(aReq, aRes) {
    const { user } = aReq;
    logger.trace('getLoginCallback:', user);

    aReq.session = Object.assign(aReq.session || {}, { user });

    const { returnTo } = aReq.session;
    if (returnTo) {
      aReq.session.returnTo = undefined;
      return aRes.redirect(returnTo);
    }
    return aRes.redirect('/authenticated/main');

  }

  // For the time being, use hydra as a default auth provider, if the authProvider query is not
  // set-
  function ensureLogin(aPath, aReq, aRes, aNext) {
    aReq.user = aReq.user || (aReq.session && aReq.session.user);
    if (!aReq.user) {
      logger.trace('ensureLogin. Not authenticated. Setting return URL to:', aReq.originalUrl);
      aReq.session = Object.assign(aReq.session || {}, { returnTo: aReq.originalUrl });
      return aRes.redirect('/login/' + (aReq.query.authProvider || 'hydra'));
    }
    return aNext();
  }

  // Reads the UUID from the header x-requester-uuid
  async function tokenAuth(aPath, aReq, aRes, aNext) {
    const token = aReq.get('x-requester-uuid') || 'unknown';
    logger.trace('tokenAuth: ', aPath, ':', token);
    const {
      DB,
      DDL,
    } = aReq.config;
    const authenticatedUser = await DB.findOne(DDL.AUTHENTICATED_USER, token);
    if (authenticatedUser) {
      aReq.user = authenticatedUser;
      DB.refreshAuthTimer(authenticatedUser);
    } else {
      // Check if the token is for a room...
      const roomInfo = await DB.findOne(DDL.WOWROOM_COL, token);
      if (!roomInfo) {
        return aRes.status(403).send(new ErrorInfo(40301, 'Unauthorized'));
      }
      aReq.user = {
        roomInfo,
        role: DDL.ROOM_ROLE,
        email: null,
      };
    }
    return aNext();
  }

  function userIsAdmin(aPath, aReq, aRes, aNext) {
    const { user, config } = aReq;
    const { DDL } = config;
    logger.trace('userIsAdmin: ', aPath, ':', user);
    if (!user || !DDL.isValidAdminRole(user.role)) {
      return aRes.status(403).send(new ErrorInfo(40301, 'Unauthorized'));
    }
    return aNext();
  }

  function renderTemplate(aRes, aTemplate, data) { // eslint-disable-line no-unused-vars
    aRes.render(aTemplate, { data }, (err, html) => {
      if (err) {
        logger.error('Invalid Template error: ', err);
        aRes.status(500).send(new ErrorInfo(50001, 'Invalid Template'));
      } else {
        aRes.send(html);
      }
    });
  }

  function getLogout(aReq, aRes) {
    logger.trace('getLogout');
    aReq.user = null;
    aReq.session = Object.assign(aReq.session || {}, { user: null, returnTo: null });
    aRes.redirect('/');
  }

  const oauthSignature = require('oauth-signature');
  const oauthOptions = { encodeSignature: false };
  // oauth_signature
  function oAuthForm(aPath, aReq, aRes, aNext) {
    return urlencodedParser(aReq, aRes,
      async () => {
        const { DB, ltiKeys } = aReq.config;
        const parameters = Object.assign({}, aReq.body);
        const {
          oauth_signature, custom_tool_url, oauth_consumer_key,
          lis_person_contact_email_primary,
        } = parameters;
        const oauthSecret = ltiKeys[aReq.body.oauth_consumer_key];
        delete parameters.oauth_signature;
        logger.trace('oAuthForm:', custom_tool_url, oauth_consumer_key, oauthSecret, ltiKeys);
        const calcSignature = oauthSignature.
          generate('POST', custom_tool_url, parameters, oauthSecret, null, oauthOptions);
        if (calcSignature !== oauth_signature) { // eslint-disable-line camelcase
          return aRes.render('error.ejs', { error: new ErrorInfo(40307, 'INCORRECT_CALL') });
        }
        const user = await DB.findOneUser(lis_person_contact_email_primary);
        if (!user) {
          // To-do: auto create users?
          return aRes.status(403).send(new ErrorInfo(40301, 'Unknown user'));
        }
        aReq.user = user;
        aReq.session = Object.assign(aReq.session || {}, { user });

        logger.trace('oAuthForm user:', user);

        return aNext();
      }
    );

  }

  return {
    passportAuth,
    passportCallback,
    getAuthProviders,
    getLogin,
    getLoginCallback,
    tokenAuth,
    ensureLogin,
    getLogout,
    userIsAdmin,
    oAuthForm,
  };

}
module.exports = Login;
