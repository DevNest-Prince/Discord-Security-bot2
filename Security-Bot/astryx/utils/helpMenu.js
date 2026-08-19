


const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');
const { createPaginationSession } = require('./pagination');

const ITEMS_PER_PAGE = 5;

const registry = {
  general: {
    title: 'General Commands',
    commands: [
      { name: 'status',           description: 'Check the bot\'s current status' },
      { name: 'avatar [user]',    description: 'View a user\'s avatar' },
      { name: 'banner [user]',    description: 'View a user\'s banner' },
      { name: 'servericon',       description: 'View the server\'s icon' },
      { name: 'membercount',      description: 'Show the server member count' },
      { name: 'urban <word>',     description: 'Look up a word on Urban Dictionary' },
      { name: 'hash <text>',      description: 'Generate a hash of the given text' },
      { name: 'snipe',            description: 'Retrieve the last deleted message' },
      { name: 'editsnipe',        description: 'Retrieve the last edited message' },
      { name: 'purge <amount>',   description: 'Bulk delete messages in a channel' },
      { name: 'list boosters',    description: 'List all current server boosters' },
      { name: 'list inrole',      description: 'List members in a specific role' },
      { name: 'list emojis',      description: 'List all server emojis' },
      { name: 'list bots',        description: 'List all bots in the server' },
      { name: 'list admins',      description: 'List all admins in the server' },
      { name: 'list invoice',     description: 'List users with no server roles' },
      { name: 'list mods',        description: 'List all moderators in the server' },
      { name: 'list early',       description: 'List early supporters in the server' },
      { name: 'list createpos',   description: 'List members sorted by account creation' },
      { name: 'list roles',       description: 'List all roles in the server' },
    ]
  },
  info: {
    title: 'Information Commands',
    commands: [
      { name: 'userinfo [user]',  description: 'View detailed info about a user' },
      { name: 'serverinfo',       description: 'View detailed info about the server' },
      { name: 'invite',           description: 'Get an invite link for the bot' },
      { name: 'users',            description: 'Show the total user count' },
      { name: 'about',            description: 'Learn about this bot' },
      { name: 'botinfo',          description: 'View detailed bot information' },
      { name: 'ping',             description: 'Check the bot\'s response time' },
      { name: 'avgping',          description: 'Check the bot\'s average latency' },
      { name: 'uptime',           description: 'Show how long the bot has been online' },
      { name: 'help [command]',   description: 'Show the help menu or a specific command' },
    ]
  },
  stats: {
    title: 'Stats Commands',
    commands: [
      { name: 'permissions [user]',   description: 'Show permissions for a user' },
      { name: 'rolecall <role>',       description: 'Display member count for a role' },
      { name: 'rolecount',             description: 'Show all roles and their member counts' },
      { name: 'roleinfo <role>',       description: 'View detailed info about a role' },
      { name: 'roleperms <role>',      description: 'Show permissions granted by a role' },
      { name: 'topic [channel]',       description: 'Show a channel\'s current topic' },
      { name: 'channelinfo [channel]', description: 'View info about a channel' },
      { name: 'emojiinfo <emoji>',     description: 'View info about an emoji' },
      { name: 'emojistats',            description: 'Show emoji usage statistics' },
      { name: 'emptyroles',            description: 'List roles with no members' },
      { name: 'firstjoins',            description: 'Show the first members to join' },
      { name: 'joined [user]',         description: 'Show when a user joined the server' },
      { name: 'joinedatpos <pos>',     description: 'Show who joined at a given position' },
      { name: 'joinpos [user]',        description: 'Show a user\'s join position' },
      { name: 'lastjoins',             description: 'Show the most recent joins' },
      { name: 'listchannels',          description: 'List all server channels' },
    ]
  },
  fun: {
    title: 'Fun Commands',
    commands: [
      { name: 'howdumb [user]',      description: 'Rate how dumb someone is' },
      { name: 'howgay [user]',       description: 'Rate someone\'s gay percentage' },
      { name: 'dare',                description: 'Get a random dare' },
      { name: 'truth',               description: 'Get a random truth question' },
      { name: 'simprate [user]',     description: 'Rate how much of a simp someone is' },
      { name: 'pickup',              description: 'Get a random pickup line' },
      { name: 'rickroll [user]',     description: 'Send a rickroll link' },
      { name: 'meme',                description: 'Get a random meme' },
      { name: 'nitro',               description: 'Generate a fake Nitro link' },
      { name: 'token',               description: 'Generate a fake bot token' },
      { name: 'texttoemoji <text>',  description: 'Convert text to emoji letters' },
      { name: 'wizz',                description: 'Send a fake screen-wiz effect' },
      { name: 'hack [user]',         description: 'Fake hack a user' },
      { name: 'ship [u1] [u2]',      description: 'Ship two users together' },
    ]
  },
  social: {
    title: 'Social Commands',
    commands: [
      { name: 'youtube <query>',    description: 'Search YouTube for a video' },
      { name: 'pinterest <query>',  description: 'Search Pinterest for images' },
      { name: 'github <user>',      description: 'Look up a GitHub profile' },
      { name: 'wikipedia <query>',  description: 'Search Wikipedia for an article' },
      { name: 'news <query>',       description: 'Search for latest news articles' },
      { name: 'google <query>',     description: 'Search Google' },
      { name: 'ping',               description: 'Check the bot\'s response time' },
    ]
  },
  roleplay: {
    title: 'Roleplay Commands',
    commands: [
      { name: 'hug [user]',        description: 'Hug someone' },
      { name: 'kiss [user]',       description: 'Kiss someone' },
      { name: 'lick [user]',       description: 'Lick someone' },
      { name: 'pat [user]',        description: 'Pat someone' },
      { name: 'slap [user]',       description: 'Slap someone' },
      { name: 'tickle [user]',     description: 'Tickle someone' },
      { name: 'poke [user]',       description: 'Poke someone' },
      { name: 'deathstare [user]', description: 'Give someone a death stare' },
      { name: 'dance',             description: 'Do a little dance' },
      { name: 'cry',               description: 'Cry' },
      { name: 'laugh',             description: 'Laugh out loud' },
      { name: 'smile',             description: 'Smile' },
      { name: 'blush',             description: 'Blush' },
      { name: 'wink [user]',       description: 'Wink at someone' },
      { name: 'thumbsup',          description: 'Give a thumbs up' },
      { name: 'clap',              description: 'Clap' },
      { name: 'bow',               description: 'Take a bow' },
      { name: 'salute',            description: 'Give a salute' },
      { name: 'facepalm',          description: 'Facepalm' },
      { name: 'shrug',             description: 'Shrug' },
      { name: 'sleep',             description: 'Fall asleep' },
      { name: 'eat',               description: 'Eat something' },
      { name: 'kill [user]',       description: 'Kill someone' },
      { name: 'run',               description: 'Run away' },
    ]
  },
  animals: {
    title: 'Animals Commands',
    commands: [
      { name: 'cat',        description: 'Get a random cat image' },
      { name: 'dog',        description: 'Get a random dog image' },
      { name: 'fox',        description: 'Get a random fox image' },
      { name: 'duck',       description: 'Get a random duck image' },
      { name: 'panda',      description: 'Get a random panda image' },
      { name: 'redpanda',   description: 'Get a random red panda image' },
      { name: 'bird',       description: 'Get a random bird image' },
      { name: 'bunny',      description: 'Get a random bunny image' },
      { name: 'bear',       description: 'Get a random bear image' },
      { name: 'pig',        description: 'Get a random pig image' },
      { name: 'possum',     description: 'Get a random possum image' },
      { name: 'sheep',      description: 'Get a random sheep image' },
      { name: 'snake',      description: 'Get a random snake image' },
      { name: 'squirrel',   description: 'Get a random squirrel image' },
      { name: 'animalfact', description: 'Get a random animal fact' },
    ]
  },
  moderation: {
    title: 'Moderation Commands',
    commands: [
      { name: 'kick <user> [reason]',           description: 'Kick a user from the server' },
      { name: 'ban <user> [reason]',            description: 'Ban a user from the server' },
      { name: 'softban <user> [reason]',        description: 'Ban and unban to delete messages' },
      { name: 'unban <user>',                   description: 'Unban a user from the server' },
      { name: 'slowmode <seconds> [channel]',   description: 'Set slowmode for a channel' },
      { name: 'lock [channel]',                 description: 'Lock a channel' },
      { name: 'unlock [channel]',               description: 'Unlock a channel' },
      { name: 'tempban <user> <dur> [reason]',  description: 'Temporarily ban a user' },
      { name: 'mute <user> [reason]',           description: 'Mute a user' },
      { name: 'unmute <user>',                  description: 'Unmute a user' },
      { name: 'temprole <user> <role> <dur>',   description: 'Temporarily assign a role' },
      { name: 'rolegive <user> <role>',         description: 'Give a role to a user' },
      { name: 'roleremove <user> <role>',       description: 'Remove a role from a user' },
      { name: 'nick <user> [nickname]',         description: 'Change or remove a member\'s server nickname' },
    ]
  },
  files: {
    title: 'Server Files Commands',
    commands: [
      { name: 'dumpsettings',      description: 'Export server settings to a file' },
      { name: 'dumproles',         description: 'Export all roles to a file' },
      { name: 'dumpchannels',      description: 'Export all text channels to a file' },
      { name: 'dumpvoicechannels', description: 'Export all voice channels to a file' },
      { name: 'dumpcategories',    description: 'Export all categories to a file' },
      { name: 'dumpemotes',        description: 'Export all server emojis to a file' },
      { name: 'dumpmessages',      description: 'Export messages from a channel' },
      { name: 'dumphumans',        description: 'Export all human members to a file' },
      { name: 'dumpbots',          description: 'Export all bots to a file' },
      { name: 'dumpusers',         description: 'Export all users to a file' },
      { name: 'dumpbans',          description: 'Export all banned users to a file' },
      { name: 'dumpwarns',         description: 'Export all warnings to a file' },
    ]
  },
  giveaway: {
    title: 'Giveaway Commands',
    commands: [
      { name: 'start',   description: 'Start a new giveaway' },
      { name: 'end',     description: 'End an active giveaway early' },
      { name: 'reroll',  description: 'Reroll the winner of a giveaway' },
    ]
  },
  vanity: {
    title: 'Vanity Roles Commands',
    commands: [
      { name: 'setup',   description: 'Setup vanity roles for this server' },
      { name: 'config',  description: 'View current vanity role configuration' },
      { name: 'reset',   description: 'Reset all vanity role settings' },
    ]
  },
  j2c: {
    title: 'Join2Create Commands',
    commands: [
      { name: 'setup',   description: 'Setup Join2Create channels for this server' },
      { name: 'config',  description: 'View current Join2Create configuration' },
      { name: 'reset',   description: 'Reset all Join2Create settings' },
    ]
  },
  automod: {
    title: 'AutoMod Commands',
    commands: [
      { name: 'setup',     description: 'Setup automod with a step-by-step wizard' },
      { name: 'settings',  description: 'View and edit current automod settings' },
      { name: 'enable',    description: 'Enable automod for this server' },
      { name: 'disable',   description: 'Disable automod for this server' },
      { name: 'whitelist', description: 'Manage exemptions from automod rules' },
      { name: 'reset',     description: 'Reset to defaults and disable automod' },
    ]
  },
  antinuke: {
    title: 'Antinuke Commands',
    commands: [
      { name: 'setup',     description: 'Setup antinuke with a step-by-step wizard' },
      { name: 'settings',  description: 'View and edit current antinuke settings' },
      { name: 'enable',    description: 'Enable antinuke for this server' },
      { name: 'disable',   description: 'Disable antinuke for this server' },
      { name: 'whitelist', description: 'Manage trusted users exempt from antinuke' },
      { name: 'reset',     description: 'Reset to defaults and disable antinuke' },
    ]
  },
  logging: {
    title: 'Logging Commands',
    commands: [
      { name: 'setup',  description: 'Setup logging channels for this server' },
      { name: 'config', description: 'View current logging configuration' },
      { name: 'reset',  description: 'Reset all logging settings' },
    ]
  },
  crypto: {
    title: 'Crypto Commands',
    commands: [
      { name: 'balance',     description: 'Check a wallet balance for a given coin and address' },
      { name: 'price',       description: 'Get the current price of a cryptocurrency' },
      { name: 'convert',     description: 'Convert an amount between two cryptocurrencies' },
      { name: 'transaction', description: 'View recent transactions for an address' },
      { name: 'news',        description: 'Latest crypto news headlines' },
      { name: 'gainers',     description: 'Top gaining coins in the last 24h' },
      { name: 'losers',      description: 'Top losing coins in the last 24h' },
    ]
  },
  feedback: {
    title: 'Feedback Commands',
    commands: [
      { name: 'setup',  description: 'Configure the feedback system with channel select menus' },
      { name: 'panel',  description: 'Send the feedback panel to the review channel' },
      { name: 'config', description: 'View current feedback configuration' },
      { name: 'reset',  description: 'Reset feedback configuration for this server' },
    ]
  },
  blacklist: {
    title: 'Blacklist Commands',
    commands: [
      { name: 'guild add',    description: 'Blacklist a guild by ID' },
      { name: 'guild remove', description: 'Remove a guild from the blacklist' },
      { name: 'guild list',   description: 'Show all blacklisted guilds' },
      { name: 'user add',     description: 'Blacklist a user by ID' },
      { name: 'user remove',  description: 'Remove a user from the blacklist' },
      { name: 'user list',    description: 'Show all blacklisted users' },
    ]
  },
  ignore: {
    title: 'Ignore Commands',
    commands: [
      { name: 'command add',    description: 'Add a command to the ignore list' },
      { name: 'command remove', description: 'Remove a command from the ignore list' },
      { name: 'command show',   description: 'Show all ignored commands' },
      { name: 'channel add',    description: 'Add a channel to the ignore list' },
      { name: 'channel remove', description: 'Remove a channel from the ignore list' },
      { name: 'channel show',   description: 'Show all ignored channels' },
      { name: 'user add',       description: 'Add a user to the ignore list' },
      { name: 'user remove',    description: 'Remove a user from the ignore list' },
      { name: 'user show',      description: 'Show all ignored users' },
      { name: 'bypass add',     description: 'Add a user to the bypass list' },
      { name: 'bypass remove',  description: 'Remove a user from the bypass list' },
      { name: 'bypass show',    description: 'Show all bypass users' },
    ]
  },
  media: {
    title: 'Media Commands',
    commands: [
      { name: 'setup',         description: 'Set up a media-only channel' },
      { name: 'remove',        description: 'Remove the media-only channel restriction' },
      { name: 'config',        description: 'View current media channel configuration' },
      { name: 'bypass add',    description: 'Add a user to the media bypass list' },
      { name: 'bypass remove', description: 'Remove a user from the media bypass list' },
      { name: 'bypass show',   description: 'Show all users in the bypass list' },
    ]
  },
  todo: {
    title: 'Todo Commands',
    commands: [
      { name: 'add <task>',  description: 'Add a new task to your list' },
      { name: 'list',        description: 'View all your current tasks' },
      { name: 'remove <id>', description: 'Remove a task by its ID' },
      { name: 'clear',       description: 'Clear all tasks at once' },
    ]
  },
  voice: {
    title: 'Voice Commands',
    commands: [
      { name: 'kick <user>',           description: 'Kick a user from voice' },
      { name: 'kickall [channel]',     description: 'Kick all users from a channel' },
      { name: 'mute <user>',           description: 'Server mute a user' },
      { name: 'muteall [channel]',     description: 'Mute all users in a channel' },
      { name: 'unmute <user>',         description: 'Server unmute a user' },
      { name: 'unmuteall [channel]',   description: 'Unmute all users in a channel' },
      { name: 'deafen <user>',         description: 'Server deafen a user' },
      { name: 'deafenall [channel]',   description: 'Deafen all users in a channel' },
      { name: 'undeafen <user>',       description: 'Server undeafen a user' },
      { name: 'undeafenall [channel]', description: 'Undeafen all users in a channel' },
      { name: 'move <user> <ch>',      description: 'Move a user to a channel' },
      { name: 'moveall <from> <to>',   description: 'Move all users between channels' },
      { name: 'pull <user>',           description: 'Pull a user to your channel' },
      { name: 'pullall <channel>',     description: 'Pull all users to your channel' },
      { name: 'lock [channel]',        description: 'Lock a voice channel' },
      { name: 'unlock [channel]',      description: 'Unlock a voice channel' },
      { name: 'private [channel]',     description: 'Make a channel private' },
      { name: 'unprivate [channel]',   description: 'Make a channel public again' },
    ]
  },
  ai: {
    title: 'AI Commands',
    commands: [
      { name: 'ask <prompt>',     description: 'Ask the AI anything' },
      { name: 'analyse <image>',  description: 'Analyse an image using AI' },
      { name: 'enable',           description: 'Enable AI auto-response in this server' },
      { name: 'disable',          description: 'Disable AI auto-response in this server' },
    ]
  },
  autoreact: {
    title: 'AutoReact Commands',
    commands: [
      { name: 'add <word> <emoji>', description: 'Add a trigger word with an emoji reaction' },
      { name: 'remove <word>',      description: 'Remove a trigger word and its reactions' },
      { name: 'list',               description: 'List all triggers and their emojis' },
      { name: 'reset',              description: 'Reset all triggers and reactions' },
    ]
  },
  welcome: {
    title: 'Welcome Commands',
    commands: [
      { name: 'setup',  description: 'Setup the welcome message for this server' },
      { name: 'config', description: 'View current welcome configuration' },
      { name: 'test',   description: 'Preview the welcome message' },
      { name: 'reset',  description: 'Reset all welcome settings' },
    ]
  },
  farewell: {
    title: 'Farewell Commands',
    commands: [
      { name: 'setup',  description: 'Setup the farewell message for this server' },
      { name: 'config', description: 'View current farewell configuration' },
      { name: 'test',   description: 'Preview the farewell message' },
      { name: 'reset',  description: 'Reset all farewell settings' },
    ]
  },
  leaderboard: {
    title: 'Leaderboard Commands',
    commands: [
      { name: 'messages', description: 'View the all-time message leaderboard' },
      { name: 'invites',  description: 'View the invite leaderboard' },
    ]
  },
  userprofile: {
    title: 'User Profile Commands',
    commands: [
      { name: 'view [user]',         description: 'View a user\'s profile' },
      { name: 'description <text>',  description: 'Set your profile description' },
      { name: 'social <platform>',   description: 'Add a social link to your profile' },
      { name: 'background <url>',    description: 'Set your profile background image' },
      { name: 'reset',               description: 'Reset your profile to default' },
      { name: 'card',                description: 'View your full profile card' },
    ]
  },
  botprofile: {
    title: 'Bot Profile Commands',
    commands: [
      { name: 'serveravatar',      description: 'View the bot\'s server avatar' },
      { name: 'serverbanner',      description: 'View the bot\'s server banner' },
      { name: 'serverbio',         description: 'View the bot\'s server bio' },
      { name: 'servername',        description: 'View the bot\'s server display name' },
      { name: 'serverresetprofile',description: 'Reset the bot\'s server profile' },
    ]
  },
  misc: {
    title: 'Misc Commands',
    commands: [
      { name: 'calc <expression>', description: 'Calculate a math expression' },
      { name: 'define <word>',     description: 'Get the definition of a word' },
      { name: 'matrix',            description: 'Display a Matrix-style animation' },
      { name: 'size [user]',       description: 'Get a size rating' },
      { name: 'afk [reason]',      description: 'Set your AFK status' },
    ]
  },
  conversion: {
    title: 'Conversion Commands',
    commands: [
      { name: 'kg <value>',      description: 'Convert kilograms to pounds' },
      { name: 'ft <value>',      description: 'Convert feet to centimeters' },
      { name: 'cm <value>',      description: 'Convert centimeters to feet' },
      { name: 'hexdec <value>',  description: 'Convert hexadecimal to decimal' },
      { name: 'dechex <value>',  description: 'Convert decimal to hexadecimal' },
      { name: 'strbin <text>',   description: 'Convert text to binary' },
      { name: 'binstr <binary>', description: 'Convert binary to text' },
      { name: 'binint <binary>', description: 'Convert binary to integer' },
      { name: 'intbin <int>',    description: 'Convert integer to binary' },
      { name: 'encode <text>',   description: 'Encode text to base64' },
      { name: 'ascii85 <text>',  description: 'Encode text using ASCII85' },
      { name: 'rot13 <text>',    description: 'Apply ROT13 encoding to text' },
      { name: 'base32 <text>',   description: 'Encode text in base32' },
      { name: 'hex <text>',      description: 'Convert text to hexadecimal' },
    ]
  },
  tracking: {
    title: 'Tracking Commands',
    commands: [
      { name: 'leaderboard messages', description: 'View the all-time message leaderboard' },
      { name: 'leaderboard invites',  description: 'View the invite leaderboard' },
      { name: 'messages [user]',      description: 'Check message count for a user' },
      { name: 'invites [user]',       description: 'Check invite count for a user' },
    ]
  },
  reactionroles: {
    title: 'Reaction Roles Commands',
    commands: [
      { name: 'setup',  description: 'Setup a reaction roles message' },
      { name: 'remove', description: 'Remove a reaction roles setup' },
    ]
  },
  tickets: {
    title: 'Ticket Commands',
    commands: [
      { name: 'ticket setup',                description: 'Setup the ticket system for your server' },
      { name: 'ticket panel',                description: 'Send a new ticket panel to the configured channel' },
      { name: 'ticket addcategory',          description: 'Add a new ticket category' },
      { name: 'ticket removecategory',       description: 'Remove a ticket category' },
      { name: 'ticket addrole <role>',       description: 'Add an additional support role' },
      { name: 'ticket removerole <role>',    description: 'Remove a support role' },
      { name: 'ticket close [reason]',       description: 'Close the current ticket' },
      { name: 'ticket open',                 description: 'Reopen a closed ticket' },
      { name: 'ticket delete [channel]',     description: 'Delete a ticket channel' },
      { name: 'ticket add <user>',           description: 'Add a user to the current ticket' },
      { name: 'ticket remove <user>',        description: 'Remove a user from the current ticket' },
      { name: 'ticket rename <name>',        description: 'Rename the current ticket channel' },
      { name: 'ticket claim',                description: 'Claim the current ticket' },
      { name: 'ticket transfer <user>',      description: 'Transfer the ticket to another staff member' },
      { name: 'ticket transcript',           description: 'Send the ticket transcript to the creator and log channel' },
      { name: 'ticket reset',                description: 'Reset the entire ticket system configuration' },
    ]
  },
};

function buildPage(title, cmds, pageIndex, totalPages) {
  const header = totalPages > 1
    ? `### ${title}\n-# Page ${pageIndex + 1}/${totalPages}`
    : `### ${title}`;
  const content = cmds.map(c => `- **${c.name}** : ${c.description}`).join('\n');

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

async function sendHelp(key, interactionOrMessage) {
  const data = registry[key];
  if (!data) return;

  const { title, commands } = data;
  const totalPages = Math.ceil(commands.length / ITEMS_PER_PAGE);
  const userId = interactionOrMessage.user?.id ?? interactionOrMessage.author?.id;

  if (totalPages <= 1) {
    const container = buildPage(title, commands, 0, 1);
    return interactionOrMessage.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  return createPaginationSession({
    interactionOrMessage,
    totalPages,
    pages: async (pageIndex) =>
      commands.slice(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE),
    renderPage: async (pageIndex, pageCommands) =>
      buildPage(title, pageCommands, pageIndex, totalPages),
    userId,
    timeout: 120000,
  }).renderInitial();
}

module.exports = { sendHelp, registry, buildPage };
