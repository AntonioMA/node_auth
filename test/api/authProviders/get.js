'use strict';
var chai = require('chai');
var expect = chai.expect;

module.exports = [
  {
    description: 'Should return the list of authenticators, which is fixed',
    testFn: function(request, app, done) {
      request(app).
        get('/authProviders').
        set('Accept', 'application/json').
        expect('Content-Type', new RegExp('application/json')).
        expect(200).
        expect(aResponse => expect(aResponse.body).to.be.deep.equals( ['fakeGoogle'] )).
        end(done);
    }
  },

];
