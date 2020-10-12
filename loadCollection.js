// Little app to import a CSV file to the data model
// The first row of the CSV are the field names, and they must correspond exactly to the
// fields the collection expects
// node loadCollection -h
// It uses the REDIS_URL variable to select the Redis instance to add the values to!

const SwaggerBP = require('swagger-boilerplate');

const { Utils } = SwaggerBP;
const { MultiLevelLogger } = Utils;

const APP_OPTIONS = [
  ['h', 'help', 'Displays this help.'],
  ['f', 'file=ARG', 'CSV file that should be imported. Mandatory.'],
  ['c', 'collection=ARG', 'Name of the collection this CSV is for. Mandatory.'],
  ['d', 'delimiter=ARG', 'Delimiter for the fields. Optional, defaults to ;'],
  ['l', 'logLevel=ARG', 'Numeric log level'],
];

const DEFAULT_OPTIONS = {
  file: undefined,
  collection: undefined,
  delimiter: ';',
  logLevel: 255,
};

function parseCommandLine() {
  const commandOpts =
    require('node-getopt').create(APP_OPTIONS).
      bindHelp().
      parseSystem();
  return Object.assign(DEFAULT_OPTIONS, commandOpts.options);
}

const options = parseCommandLine();
const logger = new MultiLevelLogger('LoadCollection', options.logLevel);
Object.keys(DEFAULT_OPTIONS).forEach((aParam) => {
  if (!options[aParam]) {
    logger.error('Missing mandatory parameter: ', aParam);
    process.exit(1);
  }
});

const DataModel = require('./server/data_model');
const DDL = require('./server/ddl');

if (!DDL.COLLECTIONS.find(e => e === options.collection)) {
  logger.error('Collection must be one of:', DDL.COLLECTIONS);
  process.exit(1);
}

const fs = require('fs');
const { parse } = require('csv');
const path = require('path');

function parseCSVFile(fileName) {
  return new Promise((resolve, reject) => {
    const parser = parse({ columns: true, delimiter: options.delimiter });
    const dir = path.dirname(fileName);

    const elements = [];
    parser.on('readable', () => {
      let record = null;
      const getNested = (keys) => {
        const orig = keys[0];
        const dest = keys[1];
        const nestedData = parseCSVFile(path.join(dir, record[orig])).then(data => [dest, data]);
        delete record[orig];
        return nestedData;
      };

      const switchValues =
        (row, promisedResults) =>
          promisedResults.
            reduce((prev, elem) =>
              (prev[elem[0]] = elem[1]) && prev, row); // eslint-disable-line prefer-destructuring

      while ((record = parser.read())) { // eslint-disable-line no-cond-assign
        const nestedPromises = Object.
          keys(record).
          filter(k => k.startsWith('*')).
          map(e => [e, e.replace('*', '')]).
          map(getNested);
        const promisedData = Promise.all(nestedPromises).then(switchValues.bind(null, record));
        elements.push(promisedData);
      }
    });

    parser.on('error', (err) => {
      logger.error(err.message);
      reject(err.message);
    });

    // When we are done, test that the parsed output matched what expected
    parser.on('finish', () => {
      resolve(Promise.all(elements));
    });

    const stream = fs.createReadStream(fileName);
    stream.on('error', (e) => {
      logger.error('Error opening file:', e.toString());
      process.exit(1);
    });
    stream.pipe(parser);
  });
}

const UPDATER = (oldV, newV) => Object.assign(oldV || {}, newV);
parseCSVFile(options.file).then((elements) => {
  logger.log('ELEMENTS GENERATED: ', JSON.stringify(elements));
  const { ServerPersistence } = SwaggerBP;
  const C = require('./server/serverConstants');
  const ENV = process.env;
  const connectionString =
    ENV.REDIS_URL || ENV.REDISTOGO_URL || '';
  const entity = options.collection;
  const serverPersistence = new ServerPersistence(
    C.CONFIG_KEYS, connectionString, options.logLevel, {},
    C.GLOBAL_PREFIX);

  const DM = new DataModel(serverPersistence, options.logLevel, DDL);
  Promise.
    all(elements.map(item => DM.update(entity, DM.getIdFor(entity, item), UPDATER, item))).
    then(() => {
      logger.log('All done. Exiting');
      process.exit(0);
    }).catch((e) => {
      logger.error('Error processing file:', e);
      process.exit(1);
    });
}).catch((e) => {
  logger.error('Error processing file:', e);
  process.exit(1);
});
