function User(aLogLevel, aModules) {
  const {
    Logger,
  } = aModules;
  const logger = new Logger('User', aLogLevel);



  // get /wowRoom/:uuid/info => For the recording agent
  function getUserInfo(aReq, aRes) {
    const { user } = aReq;
    logger.trace('getUserInfo: ', aReq.path, ':', user);
    return aRes.status(200).send(user);
  }

  return {
    getUserInfo,
  };

}
module.exports = User;
