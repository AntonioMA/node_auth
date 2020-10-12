/**
 * DDL for the redis backed database
 * At this time, only using the Authenticator entity
 */

const UUID = require('node-uuid');
const {
  STRING,
  NUMBER,
  USER_EMAIL,
  LIST_OF,
  TIMESTAMP,
} = require('./ddl_tools');

const { Utils } = require('swagger-boilerplate');

const { sanitizeId } = Utils;

// Collection names
const AUTHENTICATOR = 'Authenticator';

// converters: Array of objects defining how to convert data to store. Sample:
//  {
//    orig: 'field1',
//    dest: 'field2',
//    func: v => v.field1
// }
// will store on record.field1 the value that comes on record.field2.field1
// validators: Array of type validators /functions) to run on the input fields. Sample:
// [
//  r => r.role && VALID_ROLES.findIndex(e => e === r.role) >= 0
// ],
const DDL = {
  [AUTHENTICATOR]: {
    converters: [],
    model: STRING,
  },

};

const COLLECTIONS = Object.keys(DDL);

const KEY_GETTERS = {
  default: (entity, id) => [entity, id].join('/'),
};

const getKey = (entity, id) => (KEY_GETTERS[entity] || KEY_GETTERS.default)(entity, id);
const getIndexCollection = (entity, index) => entity + '_' + index;

module.exports = {
  DDL,
  COLLECTIONS,
  getKey,
  getIndexCollection,
};
