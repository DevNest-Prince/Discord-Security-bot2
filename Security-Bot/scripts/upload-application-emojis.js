require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const emojiFile = path.join(root, 'astryx', 'emojis.json');
const outputFile = path.join(root, 'astryx', 'emojis.uploaded.json');
const apiBase = 'https://discord.com/api/v10';
const token = process.env.BOT_TOKEN;
const applicationId = process.env.CLIENT_ID;
const dryRun = process.argv.includes('--dry-run');
const writeSource = process.argv.includes('--write-source');

if (!token || !applicationId) {
  console.error('BOT_TOKEN and CLIENT_ID are required in .env');
  process.exit(1);
}

function parseEmoji(value) {
  const match = /^<(?<animated>a?):(?<name>[A-Za-z0-9_]+):(?<id>\d+)>$/.exec(value);
  if (!match?.groups) return null;
  return {
    animated: match.groups.animated === 'a',
    name: match.groups.name,
    id: match.groups.id
  };
}

function sanitizeName(name) {
  const safe = name.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 32);
  return safe.length >= 2 ? safe : `e_${safe}`;
}

async function api(pathname, options = {}) {
  const response = await fetch(`${apiBase}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    const waitMs = Math.ceil((body.retry_after || 1) * 1000);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return api(pathname, options);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function imageDataForEmoji(emoji) {
  const ext = emoji.animated ? 'gif' : 'png';
  const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?quality=lossless`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') || (emoji.animated ? 'image/gif' : 'image/png');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 256 * 1024) {
    throw new Error(`Emoji ${emoji.name} is ${(bytes.length / 1024).toFixed(1)} KiB, above Discord's 256 KiB limit`);
  }
  return `data:${contentType};base64,${bytes.toString('base64')}`;
}

async function main() {
  const source = JSON.parse(fs.readFileSync(emojiFile, 'utf8'));
  const entries = Object.entries(source)
    .map(([key, value]) => ({ key, value, emoji: parseEmoji(value) }))
    .filter((entry) => entry.emoji);

  const listed = await api(`/applications/${applicationId}/emojis`);
  const existing = new Map((listed.items || []).map((emoji) => [emoji.name, emoji]));
  const output = { ...source };

  console.log(`Found ${entries.length} emoji references and ${existing.size} existing application emojis.`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of entries) {
    const name = sanitizeName(entry.emoji.name);
    const already = existing.get(name);
    if (already) {
      output[entry.key] = `<${already.animated ? 'a' : ''}:${already.name}:${already.id}>`;
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] would upload ${entry.key} as ${name}`);
      continue;
    }

    try {
      const image = await imageDataForEmoji(entry.emoji);
      const created = await api(`/applications/${applicationId}/emojis`, {
        method: 'POST',
        body: JSON.stringify({ name, image })
      });
      output[entry.key] = `<${created.animated ? 'a' : ''}:${created.name}:${created.id}>`;
      existing.set(created.name, created);
      uploaded++;
      console.log(`uploaded ${entry.key} -> ${created.name}`);
    } catch (error) {
      failed++;
      console.warn(`failed ${entry.key}: ${error.message}`);
    }
  }

  if (!dryRun) {
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    if (writeSource) {
      fs.writeFileSync(emojiFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`Done. uploaded=${uploaded} skipped=${skipped} failed=${failed}`);
  if (!dryRun) {
    console.log(`Wrote ${path.relative(root, outputFile)}${writeSource ? ' and updated astryx/emojis.json' : ''}.`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
