/**
 * Creates an object that exposes the required operations to interact with the app data model.
 * @param {*} aServerPersistence
 */
const { convertField, validateRecord } = require('./ddl_tools');

function DataModel(aServerPersistence, aLogLevel, DDLModule) {

  const {
    DDL,
    COLLECTIONS,
    getKey,
    getIndexCollection,
  } = DDLModule;

  const UUID = require('node-uuid');
  const { Utils } = require('swagger-boilerplate');
  const { sanitizeId, MultiLevelLogger, isA } = Utils;
  const logger = new MultiLevelLogger('DataModel', aLogLevel);

  // CRUD Operations
  const getIdFor = (entity, value) => DDL[entity] && DDL[entity].key(value);
  const create = (entity, value, expiry) => {
    const MODEL = DDL[entity];
    const id = getIdFor(entity, value);
    logger.trace('create:', entity, id, value);
    MODEL && MODEL.converters && MODEL.converters.forEach(convertField.bind(null, value));

    if (!MODEL || !isA(MODEL.model, value) || !validateRecord(MODEL.validators, value)) {
      logger.trace(
        'Rejected Object. Expected:', JSON.stringify(MODEL && MODEL.model),
        '. Got:', JSON.stringify(value));
      return Promise.reject(new Error('Invalid Value. Entity Exists: ' + !!MODEL));
    }
    const recordKey = getKey(entity, id);
    const keyCreated = expiry && aServerPersistence.setKeyEx(expiry, recordKey, value) ||
      aServerPersistence.setKey(recordKey, value);
    return keyCreated.then(() => {
      Promise.all(
        (Array.isArray(MODEL.indexes) && MODEL.indexes.map(index => aServerPersistence.setKey(
          getKey(getIndexCollection(entity, index), value[index]), recordKey)
        )) || []);
    }).then(() => value);
  };

  const findMany = (entity, query) => {
    logger.trace('findMany:', entity, query);
    return aServerPersistence.getKeysValues(getKey(entity, query), true);
  };

  const findAndLock = (entity, id) => {
    logger.trace('findAndLock:', entity, id);
    return aServerPersistence.getAndLockKey(getKey(entity, id), true);
  };

  // id can be:
  //   - an string: Just return the record whose key is the passed id
  //   - an object: Returns the first record whose values matches the one passed on the object.
  const findOne = async (entity, id) => {
    logger.trace('findOne:', entity, id);
    if (typeof id !== 'string' && typeof id !== 'object') {
      return Promise.resolve(null);
    }
    if (typeof id === 'string') {
      return aServerPersistence.getKey(getKey(entity, id), true);
    }
    const query = id;
    const MODEL = DDL[entity];
    const index = Array.isArray(MODEL.indexes) &&
      MODEL.indexes.find(e => query[e] !== null && query[e] !== undefined);
    // If we got an index, we can use that to search. Otherwise, we do a full scan
    if (index) {
      logger.trace('findOne:', entity, 'found index:', index);
      const recordKey =
        await aServerPersistence.getKey(getKey(getIndexCollection(entity, index), query[index]));
      logger.trace('findOne: Found Index Key:', recordKey);
      return (recordKey && aServerPersistence.getKey(recordKey, true)) || Promise.resolve(null);
    }

    const queryKeys = Object.keys(query);
    return findMany(entity, '*').
      then(values => values.find(value => queryKeys.every(key => value[key] === query[key])));

  };

  const remove = (entity, id) => {
    logger.trace('remove:', entity, id);
    return aServerPersistence.delKey(getKey(entity, id));
  };

  // updater is an astutism... which I know it's not a real word. Deal with it.
  // If it's a function, updates to updater(oldValue). Otherwise, updates to updater.
  // Note that you can invoke this as:
  //   update(entity, id, {x: whatever}) => updates entity/id to {x: whatever}
  //   update(entity, id, fn) => updates entity/id to fn(oldValue)
  //   update(entity, id, fn, value) => updates entity/id to fn(oldValue, newValue)
  // and it will work as expected. Or at least as I would expect.
  const update = (entity, id, updater, newV) => {
    logger.trace('update:', entity, id, typeof updater);
    // At this point this is the same as create...
    return findOne(entity, id).
      then(oV => create(entity, (typeof updater === 'function' && updater(oV, newV)) || updater));
  };

  const OPERATIONS = {
    create, findOne, findMany, remove, update, getIdFor,
  };
  // End CRUD operations

  const getAuthUserForProfile = profile => {
    logger.trace('getAuthUserForProfile: ', profile);
    return Promise.resolve(profile);
  }

  const COMPLEX_OPERATIONS = {
    getAuthUserForProfile,
  };

  // End Complex Ops.

  const MAPPED_SIMPLE_OPS =
   COLLECTIONS.map(coll =>
     Object.
       keys(OPERATIONS).
       reduce((prev, current, index, elems) =>
         (prev[elems[index] + coll] = OPERATIONS[elems[index]].bind(null, coll)) && prev, {})).
     reduce((previous, current) => Object.assign(previous, current), {});

  return Object.
    assign(MAPPED_SIMPLE_OPS, OPERATIONS, COMPLEX_OPERATIONS);

}

module.exports = DataModel;
