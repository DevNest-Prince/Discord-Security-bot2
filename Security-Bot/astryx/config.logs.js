require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

// Maps the exported log keys to their matching .env variable names.
const KEYS = {
    JOIN_LOGS: 'JOIN_LOGS_WEBHOOK_URL',
    LEAVE_LOGS: 'LEAVE_LOGS_WEBHOOK_URL',
    SLASH_LOGS: 'SLASH_LOGS_WEBHOOK_URL',
    PREFIX_LOGS: 'PREFIX_LOGS_WEBHOOK_URL',
    ERROR_LOGS: 'ERROR_LOGS_WEBHOOK_URL',
    DM_LOGS: 'DM_LOGS_WEBHOOK_URL'
};

const logs = {};
for (const [key, envKey] of Object.entries(KEYS)) {
    logs[key] = process.env[envKey] || '';
}

// Update (or append) the given KEY=value pairs inside the .env file, preserving
// existing lines/comments.
function writeEnv(updates) {
    let content = '';
    try { content = fs.readFileSync(ENV_PATH, 'utf8'); } catch (_) { content = ''; }

    const lines = content.split(/\r?\n/);
    const seen = new Set();

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*([A-Z0-9_]+)\s*=/);
        if (match && Object.prototype.hasOwnProperty.call(updates, match[1])) {
            lines[i] = `${match[1]}=${updates[match[1]]}`;
            seen.add(match[1]);
        }
    }

    for (const [key, value] of Object.entries(updates)) {
        if (!seen.has(key)) lines.push(`${key}=${value}`);
    }

    fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');
}

/**
 * Apply new webhook URLs at runtime AND persist them to .env.
 * Accepts a map keyed by the log names above, e.g. { JOIN_LOGS: '...', ERROR_LOGS: '...' }.
 * botLogger reads these properties on every call, so updates take effect immediately
 * without a restart.
 */
logs.applyWebhookUrls = function applyWebhookUrls(map) {
    const updates = {};
    for (const [key, envKey] of Object.entries(KEYS)) {
        if (map[key] !== undefined && map[key] !== null) {
            logs[key] = map[key];
            process.env[envKey] = map[key];
            updates[envKey] = map[key];
        }
    }
    if (Object.keys(updates).length > 0) writeEnv(updates);
    return updates;
};

module.exports = logs;
