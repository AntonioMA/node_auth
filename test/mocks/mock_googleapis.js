'use strict';

const UUID = require('node-uuid');

function getFnProxy(original) {
  const PROXY = {
    get(target, element) { /* jshint ignore: line */
      return doNothing;        
    }  
  };
  const RV = {};
  Object.keys(original).forEach( k => {
    RV[k] = new Proxy({}, PROXY);
  });
  return RV;
}

const doNothing = (params, cb) => {
  if (typeof cb === 'function') {
    params.id = params.id || UUID.v4(); // Just in case...
    return cb(null, params);
  }
  return getFnProxy({});
};

const googleapis = require('googleapis');

module.exports = {
  auth: {
    JWT: function() { return {authorize: cb => cb(null, {})}; }
  },
  calendar: p => getFnProxy(googleapis.calendar(p))
};
