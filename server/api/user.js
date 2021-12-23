function User(aLogLevel, aModules) {
  const {
    Logger,
  } = aModules;
  const logger = new Logger('User', aLogLevel);



  // get /wowRoom/:uuid/info => For the recording agent
  function getUserInfo(aReq, aRes) {
    const { user } = aReq;
    logger.trace('getUserInfo: ', aReq.path, ':', user);
    return aRes.status(200).send('<!doctype html><head><title>User Info</title></head><body><p>UserInfo:</p><p>' +
    JSON.stringify(user, null, 2) + '</p><p>You can access the source code for this at '+
    '<a href="https://github.com/AntonioMA/node_auth">https://github.com/AntonioMA/node_auth</a>' +
    '</body></html>');
  }

  return {
    getUserInfo,
  };

}
module.exports = User;
