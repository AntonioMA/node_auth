'use strict';
var sinon = require('sinon');
var RealOpentok = require('opentok');

const FAKE_SESSION = 'falsesessionidbythemock';
const FAKE_TOKEN = 'falsetokenbythemock';

var _archives = {};

function FakeArchive(aSessionId, aOptions, aStatus) {
  var newArchive =  {
    createdAt: Date.now(),
    duration: 100000,
    id: (Math.random() + '').replace('.','_'),
    name: aOptions.name || 'unnamed',
    partnerId: '0xdeadcafe',
    reason: 'unknown',
    sessionId: aSessionId,
    size: 1000,
    status: aStatus,
    hasAudio: true,
    hasVideo: false,
    outputMode: aOptions.outputMode || 'composite',
    url: 'http://nothing.to.see/here'
  };
  _archives[newArchive.id] = newArchive;
  return newArchive;
}

function Opentok(aApiKey, aApiSecret) {

  var opentok = new RealOpentok(aApiKey, aApiSecret);

  Opentok.instances.push(opentok);

  // We must mock/stub some of the Opentok methods before the app is created
  // because they might be renamed/rebinded...
  sinon.stub(opentok, 'startArchive', function(aSessionId, aArchiveOptions, aCallback) {
    let isValidSession = aSessionId === FAKE_SESSION || aSessionId.match(/x_[0-9.]+_x/) !== null;
    setTimeout(() =>
      aCallback(!isValidSession && 'ARCHIVE_ERROR' || null,
                isValidSession && new FakeArchive(aSessionId, aArchiveOptions, 'started') || null)
    );
  });

  sinon.stub(opentok, 'stopArchive', function(aArchiveId, aCallback) {
    setTimeout(() => {
      if (_archives[aArchiveId]) {
        _archives[aArchiveId].status = 'stopped';
      }
      aCallback(!_archives[aArchiveId] && 'ARCHIVE_ERROR' || null, _archives[aArchiveId]);
    });
  });

  sinon.stub(opentok, 'getArchive', function(aArchiveId, aCallback) {
    setTimeout(
      aCallback.bind(undefined, !_archives[aArchiveId] && 'ARCHIVE_ERROR' || null,
                     _archives[aArchiveId])
    );
  });

  sinon.stub(opentok, 'listArchives', function(aOptions, aCallback) {
    var sessionId = aOptions && aOptions.sessionId;
    var list =
      Object.
        keys(_archives).
        map(key => _archives[key]).
        filter(elem => !sessionId || elem.sessionId === sessionId);
    setTimeout(aCallback.bind(undefined, null, list));
  });

  sinon.stub(opentok, 'createSession', function(aOptions, aCallback) {
    setTimeout(() => {
      aCallback(null, { sessionId: FAKE_SESSION });
    });
  });

  sinon.stub(opentok, 'generateToken', function(aSessionId, aOptions) {
    return FAKE_TOKEN;
  });

  opentok._sinonRestore = function() {
    ['startArchive', 'stopArchive', 'getArchive', 'listArchives'].forEach(method => {
      opentok[method].restore();
    });
  };

  return opentok;
}

Opentok.getNewArchive = (aSessionId, aArchiveOptions) => {
  return new FakeArchive(aSessionId, aArchiveOptions, 'started');
};

// I'm not convinced this is really needed but...
Opentok.instances = [];
Opentok.restoreInstances = function() {
  Opentok.instances.forEach(instance => {
    instance._sinonRestore();
  });
};


Opentok.FAKE_SESSION = FAKE_SESSION;
Opentok.FAKE_TOKEN = FAKE_TOKEN;

module.exports = Opentok;
