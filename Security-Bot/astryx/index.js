


const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, ActivityType } = require('discord.js');
const Dokdo = require('dokdo');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { loadSlashCommands, loadPrefixCommands, loadHybridCommands, reloadAllCommands } = require('./utils/commandLoader');
const { colors, printHeader, printLoading, printSuccess, printError, printInfo, printSystemReady } = require('./utils/consoleLogger');
const botLogger = require('./utils/botLogger');

// Clear whatever the host printed during startup/boot, so astryx's own
// console output begins on a clean screen.
console.clear();
if (process.stdout.isTTY) {
  // Also wipe the scrollback buffer, not just the visible viewport.
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

printHeader();

function formatStartupError(error) {
  return error?.message || error?.parent?.message || error?.original?.message || error?.code || String(error);
}

const missingEnv = config.getMissingRequiredEnv();
if (missingEnv.length > 0) {
  printError(`Missing required environment variables: ${missingEnv.join(', ')}`);
  printInfo('Create a .env file from .env.example before starting astryx.');
  process.exit(1);
}

const _emitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  const msg = typeof warning === 'string' ? warning : warning?.message ?? '';
  if (msg.includes('ready event has been renamed to clientReady')) return;
  return _emitWarning.call(process, warning, ...args);
};

global.astryx = {
  bot: { color: '#5865F2' },
  db: { timezone: '+00:00' }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.prefixCommands = new Collection();

if (!process.env.SHELL) process.env.SHELL = '/bin/bash';

client.dokdo = new Dokdo.Client(client, {
  prefix: config.PREFIX,
  aliases: ['dok', 'jsk'],
  owners: config.OWNER_IDS,
  secrets: [config.BOT_TOKEN]
});

client.reloadAllCommands = function () {
  try {
    return reloadAllCommands(this, __dirname);
  } catch (error) {
    return { success: false, message: 'Failed to reload commands', error: error.stack };
  }
};

const commandsPath = path.join(__dirname, 'commands');
const pCommandsPath = path.join(__dirname, 'pCommands');
const hybridPath = path.join(__dirname, 'hybrid');

loadSlashCommands(client, commandsPath);
loadPrefixCommands(client, pCommandsPath);
loadHybridCommands(client, hybridPath);

printLoading('Event handlers');
const eventsPath = path.join(__dirname, 'events');
let loadedEvents = 0;

if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if ('name' in event && 'execute' in event) {
      client.on(event.name, (...args) => event.execute(...args, client));
      loadedEvents++;
    }
  }
  const eventSubdirs = ['logging', 'antinuke', 'automod', 'antiraid', 'roles'];
  const subdirsLoaded = [];
  for (const subdir of eventSubdirs) {
    const subdirPath = path.join(eventsPath, subdir);
    if (!fs.existsSync(subdirPath)) continue;

    const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const mod = require(path.join(subdirPath, file));
      if ('init' in mod && typeof mod.init === 'function') mod.init(client);
    }
    subdirsLoaded.push(subdir);
  }

  const standaloneInits = [
    { file: 'welcomeEvent.js', label: 'welcome' },
    { file: 'farewellEvent.js', label: 'farewell' },
    { file: 'snipeEvent.js',   label: 'snipe' }
  ];
  const standaloneLoaded = [];
  for (const { file, label } of standaloneInits) {
    const filePath = path.join(eventsPath, file);
    if (!fs.existsSync(filePath)) continue;
    const mod = require(filePath);
    if ('init' in mod && typeof mod.init === 'function') {
      mod.init(client);
      standaloneLoaded.push(label);
    }
  }

  const allModules = [...subdirsLoaded, ...standaloneLoaded].join(', ');
  printSuccess(`Event handlers ready - ${loadedEvents} events - ${allModules}`);
} else {
  printInfo('No events directory found, skipping event loading');
}

printLoading('Database connection');
const models = require('../database/models');

const dbModules = {
  autobump: require('../database/autobump'),
  commandLock: require('../database/commandLock'),
  feedback: require('../database/feedback'),
  userStats: require('../database/userStats'),
  vanityRoles: require('../database/vanityRoles'),
  ignoreDb: require('../database/ignoreDb'),
  mediaDb: require('../database/mediaDb'),
  reminders: require('../database/reminders'),
};

const dbInitPromise = Promise.all([
  models.dbReady,
  ...Object.values(dbModules).map(m => m.dbReady)
]).then(() => {
  printSuccess('Database initialized and all tables synced');
}).catch(err => {
  printError('Database initialization failed: ' + formatStartupError(err));
  throw err;
});

client.once('clientReady', async () => {
  printSuccess(`Authentication successful -> ${colors.PURPLE}${client.user.tag}${colors.RESET}`);

  client.user.setPresence({
    status: 'idle',
    activities: [{
      name: `${config.PREFIX}help | @astryx`,
      type: ActivityType.Listening
    }]
  });

  printLoading('Synchronizing slash commands');
  try {
    await registerCommands();
    printSuccess(`Command synchronization complete (${client.commands.size} commands)`);
  } catch (error) {
    printError(`Failed to register commands: ${error.message}`);
  }

  printInfo(`Connected to ${client.guilds.cache.size} guilds`);

  try {
    const { checkGiveaways } = require('./utils/giveawayUtils');
    setInterval(() => { checkGiveaways(client); }, 10000);

    const { startBackgroundRefresh: startAnimalRefresh } = require('./utils/animalApi');
    startAnimalRefresh();

  } catch (error) {
    printError('Failed to initialize database-dependent systems: ' + error.message);
  }

  printSystemReady();
});

const COMMAND_HASH_FILE = path.join(__dirname, '.command_hash');

async function registerCommands() {
  const commands = [];

  for (const command of client.commands.values()) {
    const commandData = command.data.toJSON();
    commandData.integration_types = [0, 1];
    commandData.contexts = [0, 1, 2];
    commands.push(commandData);
  }

  const currentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(commands))
    .digest('hex');

  let savedHash = null;
  try {
    savedHash = fs.readFileSync(COMMAND_HASH_FILE, 'utf8').trim();
  } catch (_) {}

  if (savedHash === currentHash) {
    printInfo('Slash commands unchanged - skipping registration');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);
  await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });

  fs.writeFileSync(COMMAND_HASH_FILE, currentHash, 'utf8');
}

client.on('error', (error) => {
  printError(`Discord client error: ${error.message}`);
  botLogger.logError(error, 'Discord client error', client).catch(() => {});
});

process.on('unhandledRejection', (error) => {
  printError(`Unhandled rejection: ${error?.message ?? String(error)}`);
  botLogger.logError(error instanceof Error ? error : new Error(String(error)), 'Unhandled rejection', client).catch(() => {});
});

process.on('uncaughtException', (error) => {
  printError(`Uncaught exception: ${error?.message ?? String(error)}`);
  const exit = () => process.exit(1);
  // Guarantee the process exits even if the webhook log hangs.
  const failsafe = setTimeout(exit, 3000);
  failsafe.unref?.();
  botLogger
    .logError(error instanceof Error ? error : new Error(String(error)), 'Uncaught exception', client)
    .finally(() => { clearTimeout(failsafe); exit(); });
});

let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${colors.YELLOW}Warning${colors.RESET}  Received ${signal}, shutting down gracefully...`);
  const failsafe = setTimeout(() => process.exit(0), 5000);
  failsafe.unref?.();
  try { client.destroy(); } catch (_) {}
  try {
    await models.sequelize.close();
  } catch (_) {}
  clearTimeout(failsafe);
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

printLoading('Discord authentication');
dbInitPromise.then(() => {
  return client.login(config.BOT_TOKEN);
}).catch(error => {
  printError(`Startup failed: ${formatStartupError(error)}`);
  process.exit(1);
});
