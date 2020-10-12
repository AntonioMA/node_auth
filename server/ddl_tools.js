const STRING = '';
const NUMBER = 0;
const TIMESTAMP = 0;
const USER_EMAIL = STRING;
const LIST_OF = type => [type];

const TZ_OFFSET = new Date().getTimezoneOffset() * 60000;
const TO_TIMESTAMP = date => new Date(date).getTime() - TZ_OFFSET;

const DATE_CONVERTER = {
  orig: 'date',
  dest: 'timestamp',
  func: TO_TIMESTAMP,
};

const convertField = (record, converter) => {
  if (record[converter.orig] !== undefined || record[converter.dest] === undefined) {
    const aux = record[converter.orig];
    delete record[converter.orig];
    record[converter.dest] = converter.func(aux);
  }
  return record;
};

const validateRecord =
  (validators, record) => !Array.isArray(validators) || validators.every(f => f(record));

module.exports = {
  STRING,
  NUMBER,
  TIMESTAMP,
  USER_EMAIL,
  LIST_OF,
  DATE_CONVERTER,
  convertField,
  validateRecord,
};
