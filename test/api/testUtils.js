'use strict';


function setListOfUsers(modules, testUsers) {
  // I can't say I like this too much, and I wrote it this way... modules will have
  // serverPersistence in after the app is initialized. Trust me on this...
  const serverPersistence = modules.serverPersistence;
  const DB = new modules.DM(serverPersistence, modules.TEST_LOG_LEVEL);
  return Promise.all(testUsers.map(aUser => DB.createUser(aUser)));
}

function addToken(modules, email) {
  const serverPersistence = modules.serverPersistence;
  const DB = new modules.DM(serverPersistence, modules.TEST_LOG_LEVEL);
  return DB.getAuthUserForProfile({email});
}

function setupPrecondition(persistenceProvider, data) {
  Object.keys(data).forEach(aKey => {
    persistenceProvider.internalState[aKey] = data[aKey];
  });
}

function checkExistance(persistenceProvider, data, shouldExist) {
  return Object.keys(data).
    reduce(
      (aReturned, aKey) =>  aReturned +
        ((!!persistenceProvider.internalState[aKey] ^ shouldExist) &&
        'Incorrect state for ' + aKey  || ''),
      '');
}

function setListOfCompanies(modules, testCompanies) {
  // I can't say I like this too much, and I wrote it this way... modules will have
  // serverPersistence in after the app is initialized. Trust me on this...
  const serverPersistence = modules.serverPersistence;
  const DB = new modules.DM(serverPersistence, modules.TEST_LOG_LEVEL);
  return Promise.
    all(testCompanies.map(aCompany => DB.createCompany(aCompany)));
}

module.exports = {
  setupPrecondition,
  checkExistance,
  setListOfUsers,
  setListOfCompanies,
  addToken
};
