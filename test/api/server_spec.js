
const request = require('supertest');
const TEST_LOG_LEVEL = 0;

const ANSI_RED = '\033[31m';
const ANSI_RESET = '\033[m';

describe('ZeroSpace server', function() {
  'use strict';
  const fs = require('fs');

  let app;
  let Opentok;
  let PersistenceProvider;


  const YAML = require('yamljs');

  const apiSpec = YAML.parse(fs.readFileSync('./api.yml').toString('utf8'));

  let mocks;

  const internalState = {};

  // Note that since everything is in api.json, we do could just parse
  // that and generate the test cases automatically. At the moment
  // it's more work than doing it manually though, so not worth it.
  // We do parse it to get the paths to test though.
  before(function() {

    Opentok = require('../mocks/mock_opentok.js');
    PersistenceProvider = require('../mocks/mock_persistenceProvider');

    mocks = {
      TEST_LOG_LEVEL,
      PersistenceProvider,
      Opentok,
      googleapis: require('../mocks/mock_googleapis'),
      C: require('../../server/serverConstants'),
      CU: require('../../server/api/cryptUtils'),
      DM: require('../../server/data_model'),
      TU: require('./testUtils')
    };

    const GLOBAL_PREFIX = mocks.C.GLOBAL_PREFIX;
    PersistenceProvider.setInternalState(internalState, GLOBAL_PREFIX);
    internalState[GLOBAL_PREFIX + mocks.C.AUTHENTICATOR_PROVIDERS] = 'fakeGoogle';
    internalState[GLOBAL_PREFIX + mocks.DM.AUTHENTICATOR + '/fakeGoogle'] = JSON.stringify(
      {
        clientID: "fakeClientId.apps.googleusercontent.com",
        clientSecret: "yepFakeAlso",
        authenticateOptions: {
          scope: [ "profile", "https://www.googleapis.com/auth/userinfo.email" ]},
          strategy: { module: "passport-google-oauth","object":"OAuth2Strategy" }
      }
    );
    internalState[GLOBAL_PREFIX + mocks.C.TB_API_KEY] = '1234';
    internalState[GLOBAL_PREFIX + mocks.C.TB_SECRET] = 'abcd';
    internalState[GLOBAL_PREFIX + mocks.C.GOOGLE_CALENDAR_API_KEY] = 'fakeApiKey';
    internalState[GLOBAL_PREFIX + mocks.C.CALENDAR_CREDENTIALS] = '{}';

    // Note that this actually executes on the level where the Grunt file is
    // So that's what '.' is. OTOH, the requires are relative to *this* file.
    // Yep, I don't like that either. Nope, I can't do anything about that.
    // Create the app with the json we've just read.
    app = (require('swagger-boilerplate').App)(
      {
        modulePath: __dirname + '/../../server/',
        staticPath: '../../web',
        apiDef: apiSpec,
        logLevel: TEST_LOG_LEVEL
      }, mocks);

  });

  after(function() {
    Opentok.restoreInstances();
  });

  const defaultTest = [{
    description: ANSI_RED + 'Not tested!' + ANSI_RESET,
    testFn: function(aRequest, aApp, done, mocks) { /* jshint ignore: line */
      done();
    }
  }];

  Object.keys(apiSpec.paths).forEach(aPath =>
    Object.keys(apiSpec.paths[aPath]).forEach(aVerb => {
      const filePath = aPath.replace(/{/g, '_').replace(/}/g,'');
      const modulePath = '.' + filePath + '/' + aVerb;
      try {
        apiSpec.paths[aPath][aVerb].tests = require(modulePath);
      } catch(e) {
        apiSpec.paths[aPath][aVerb].tests = defaultTest;
      }
    })
  );

  describe('Automatic Paths from api.yml', function() {
    Object.keys(apiSpec.paths).forEach(aPath =>
      Object.keys(apiSpec.paths[aPath]).forEach(aVerb => {
        apiSpec.paths[aPath][aVerb].tests.forEach(aTest => {
          it(aVerb + ' - ' + aPath + ': ' + aTest.description, function(done) {
            aTest.testFn(request, app, done, mocks);
          });
        });
      })
    );
  });

});
