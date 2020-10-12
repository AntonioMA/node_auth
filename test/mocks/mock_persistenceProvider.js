'use strict';

// We don't need to mock all the functionality. Just what we're actually using...

// The mock state is shared between all the instances!
var _internalState;
var _prefix;

module.exports = function() {

  function Pipeline() {
    var requestedKeys = [];

    this.get = function(aKey) {
      requestedKeys.push(aKey);
      return this;
    };

    this.exec = function() {
      return Promise.resolve(requestedKeys.map(key => [null, _internalState[key]]));
    };
  }

  return {
    on: function(aSignal, aCB) {
      if (aSignal === 'ready') {
        setTimeout(aCB);
      }
    },
    pipeline: function() {
      return new Pipeline();
    },
    get: function(aKey) {
      return Promise.resolve(_internalState[aKey]);
    },
    set: function(aKey, aValue) {
      _internalState[aKey] = aValue;
      return Promise.resolve(aValue);
    },
    del: function(aKey) {
      delete _internalState[aKey];
      return Promise.resolve();
    },
    rpush: function(aKey, aValue) {
      if (_internalState[aKey] && !Array.isArray(_internalState[aKey])) {
        return Promise.reject('Incorrect Key Type');
      }
      _internalState[aKey] = _internalState[aKey] || [];
      _internalState[aKey].push(aValue);
      return Promise.resolve(_internalState[aKey]);
    },
    expire: function(key, time) {
      setTimeout(() => delete _internalState[key], time * 1000);
    },
    setex: function(aKey, seconds, aValue) {
      _internalState[aKey] = aValue;
      setTimeout(() => delete _internalState[aKey], seconds * 1000);
      return Promise.resolve(aValue);
    },
    getKey: function(aKey, aAsObject) {
      var rv = this.get(_prefix + aKey);
      if (aAsObject) {
        rv = rv.then(aStr => aStr && JSON.parse(aStr));
      }
      return rv;
    },
    keys: function(pattern) { // Returns a promise that fulfills with an array
      var regex = new RegExp('^' + pattern.split('*').join('.*') + '$');
      return Promise.resolve(Object.keys(_internalState).filter(e => regex.test(e)));
    },
    llen: function(aKey) {
      return Promise.
        resolve(Array.isArray(_internalState[aKey] && _internalState[aKey].length || 0));
    },
    lrange: function(aKey, aInit, aEnd) {
      return Promise.resolve(
        Array.isArray(_internalState[aKey]) && _internalState[aKey].slice(aInit, aEnd) || []
        );
    },
    get internalState() {
      return _internalState;
    }
  };
};

module.exports.setInternalState = function(state, prefix) {
  _internalState = state;
  _prefix = prefix || '';
};
