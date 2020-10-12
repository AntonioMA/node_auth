// Little app to import a JSON file on Redis
// node addJSONKey -h
// It uses the REDIS_URL variable to select the Redis instance to add the values to!

const { Utils } = require('swagger-boilerplate');

const Logger = Utils.MultiLevelLogger;
const logger = new Logger('AddJSONKey', 255);

const APP_OPTIONS = [
  ['h', 'help', 'Displays this help.'],
  ['f', 'file=ARG', 'JSON file that should be imported. Mandatory'],
  ['k', 'key=ARG', 'Name of the key this JSON should be imported as. Mandatory.'],
];

const DEFAULT_OPTIONS = {
  file: undefined,
  key: undefined,
};

function parseCommandLine() {
  const commandOpts =
    require('node-getopt').create(APP_OPTIONS).
      bindHelp().
      parseSystem();
  const options = {};
  Object.keys(DEFAULT_OPTIONS).forEach((option) => {
    options[option] = commandOpts.options[option] || DEFAULT_OPTIONS[option];
  });

  return options;
}

const options = parseCommandLine();
['file', 'key'].forEach((aParam) => {
  if (!options[aParam]) {
    logger.error('Missing mandatory parameter: ', aParam);
    process.exit(1);
  }
});

const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis(process.env.REDIS_URL);
const readFile = Utils.promisify(fs.readFile);
logger.log('Reading file: ', options.file);
readFile(options.file).then((aContents) => {
  const content = JSON.stringify(JSON.parse(aContents));
  logger.log('Setting: ', options.key, 'to', content);
  redis.set(options.key, content).then(() => process.exit(0));
}).catch((e) => {
  logger.error('Error reading file:', e);
  process.exit(1);
});
