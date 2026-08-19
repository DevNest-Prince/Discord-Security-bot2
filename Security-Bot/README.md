🤫 astryx

### The Ultimate Multipurpose Discord Bot

A powerful, fast, and feature-rich Discord bot built with **discord.js v14**.

*Built for communities of every size.*

</div>

---

## ✨ Features

astryx combines everything you need into one powerful Discord bot.

| Category | Description |
| :-------- | :---------- |
| 🛡️ Moderation | Ban, Kick, Mute, Timeout, Lock, Unlock, Slowmode, Tempban, Softban |
| ⚔️ Antinuke | Advanced protection against raids and malicious actions |
| 🚔 Automod | Automatic spam, invite, scam and abuse protection |
| 🎫 Tickets | Fully configurable support ticket system |
| 🎭 Reaction Roles | Self-assignable roles using reactions |
| 👋 Welcome | Custom welcome and farewell messages |
| 📝 Logging | Comprehensive server logging with webhook support |
| 🎁 Giveaways | Create and manage giveaways |
| 😄 Fun | Memes, Truth or Dare, Roleplay, Fake Messages |
| 🔍 Utility | Avatar, Banner, User Info, Server Info, Ping and more |
| 🔄 Converters | Unit, Base, Text and Encoding converters |
| 🐾 Animals | Random adorable animal pictures |
| 💰 Crypto | Cryptocurrency prices and information |
| 📚 Wikipedia | Search Wikipedia instantly |
| 📰 News | Latest news headlines |
| 🔊 TTS | Text-to-speech in voice channels |
| 🔗 Join2Create | Dynamic voice channel creation |
| 👤 Profiles | Custom user profiles |
| 📋 Todo | Personal task lists |
| 📌 Reminders | Set and manage reminders |
| 🎨 Vanity Roles | Role assignment based on vanity URLs |
| 📤 Export | Export channels, members, roles and server data |
| 🖼️ Media | Image tools and manipulation |
| 🏆 Leaderboards | Server activity leaderboards |

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd astryx
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env` file:

```env
# ── Core — Required ──────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/dbname
BOT_TOKEN=your_bot_token
CLIENT_ID=your_client_id
OWNER_ID=your_discord_user_id

# ── Core — Optional (have sensible defaults) ─────────────────────
PREFIX=,                       # default: ,
DB_SYNC=true                   # default: true
SUPPORT_SERVER=https://discord.gg/...
BOTBANNER=https://...image_url...

# ── External Services (optional — enable specific commands) ──────
GROQ_API_KEY=                  # /tts command
SERPAPI_API_KEY=               # /google command
TENOR_API_KEY=                 # GIF commands (fun / roleplay)
TENOR_CLIENT_KEY=astryx_discord_bot
BYTEZ_API_KEY=                 # image analysis
CLOUDFLARE_ACCOUNT_ID=         # reserved / advanced use
CLOUDFLARE_API_TOKEN=          # reserved / advanced use

# ── Webhook Logs — run ,setup to generate these automatically ────
JOIN_LOGS_WEBHOOK_URL=
LEAVE_LOGS_WEBHOOK_URL=
SLASH_LOGS_WEBHOOK_URL=
PREFIX_LOGS_WEBHOOK_URL=
ERROR_LOGS_WEBHOOK_URL=
DM_LOGS_WEBHOOK_URL=
```

> ⚠️ **Never commit your real `.env`.** It holds your bot token and database
> password — anyone with them can control your bot and data. Keep it in
> `.gitignore` and rotate any secret that leaks.

### What each variable does & why it's needed

**Core — Required** (the bot will refuse to start without these):

| Variable | Why it's needed | Where to get it |
| :------- | :-------------- | :-------------- |
| `DATABASE_URL` | PostgreSQL connection string. **All** persistent data (settings, tickets, giveaways, stats, reminders, etc.) lives here — without it nothing can be saved. | [Neon](https://neon.tech), [Supabase](https://supabase.com), or any Postgres host |
| `BOT_TOKEN` | The Discord bot's login token. This is how the bot authenticates and connects to Discord. | [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Bot** → **Reset Token** |
| `CLIENT_ID` | Your application's ID. Required to register slash commands to the correct app. | Developer Portal → **General Information** → **Application ID** |
| `OWNER_ID` | Your Discord user ID. Unlocks owner-only commands (`eval`, `setup`, `reboot`, admin lock, etc.) and bypasses cooldowns/locks. | Enable Developer Mode in Discord → right-click your name → **Copy User ID** |

**Core — Optional** (work out of the box with defaults):

| Variable | Why it's needed | Default |
| :------- | :-------------- | :------ |
| `PREFIX` | Character(s) that trigger prefix commands (e.g. `,help`). | `,` |
| `DB_SYNC` | If `true`, Sequelize auto-creates/syncs tables on startup. Set `false` in production once tables exist to skip sync. | `true` |
| `SUPPORT_SERVER` | Invite link shown in help/info commands. | *(empty)* |
| `BOTBANNER` | Banner image URL used in some embeds/cards. | *(empty)* |

**External Services** (optional — each only enables the listed feature; leaving it empty just disables that one command):

| Variable | Enables | Where to get it |
| :------- | :------ | :-------------- |
| `GROQ_API_KEY` | `/tts` text-to-speech | [console.groq.com](https://console.groq.com) |
| `SERPAPI_API_KEY` | `/google` search | [serpapi.com](https://serpapi.com) |
| `TENOR_API_KEY` | GIFs in fun / roleplay commands | [Tenor API](https://developers.google.com/tenor/guides/quickstart) |
| `TENOR_CLIENT_KEY` | App identifier sent with Tenor requests (any string). | defaults to `astryx_discord_bot` |
| `BYTEZ_API_KEY` | AI image analysis | [bytez.com](https://bytez.com) |
| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` | Reserved for advanced/optional integrations; not required by any core command. | [Cloudflare Dashboard](https://dash.cloudflare.com) |

**Webhook Logs** (optional — bot-event logging to Discord channels):

| Variable | Logs |
| :------- | :--- |
| `JOIN_LOGS_WEBHOOK_URL` | Bot joins a server |
| `LEAVE_LOGS_WEBHOOK_URL` | Bot leaves a server |
| `SLASH_LOGS_WEBHOOK_URL` | Slash command usage |
| `PREFIX_LOGS_WEBHOOK_URL` | Prefix command usage |
| `ERROR_LOGS_WEBHOOK_URL` | Runtime errors (view in-bot with `,errorlog`) |
| `DM_LOGS_WEBHOOK_URL` | DMs sent to the bot |

> 💡 You don't have to fill the webhook URLs by hand — run the owner-only
> `,setup` command after the bot is online and it will create the channels
> and webhooks for you (see [Setup Command](#️-setup-command) below).

### 4. Upload emojis

```bash
npm run emojis:upload
```

### 5. Start the bot

```bash
npm start
```

---

## ⚙️ Setup Command

After the bot is running, use the owner-only `,setup` command in any server to automatically:

- Create a `astryx-logging` category
- Create 6 logging channels (join, leave, slash, prefix, error, DM)
- Generate webhooks for each channel
- Print all webhook URLs ready to paste into `.env`

---

## 📜 Available Scripts

| Command | Description |
| :------ | :---------- |
| `npm start` | Start the bot |
| `npm run check` | Check all files for syntax errors |
| `npm run emojis:upload` | Upload application emojis to Discord |
| `npm run emojis:dry-run` | Preview emoji upload without changes |

---

## 🛠️ Tech Stack

- **Runtime** — Node.js 18+
- **Discord** — discord.js v14
- **Database** — PostgreSQL + Sequelize ORM
- **Web** — Express + EJS
- **Canvas** — @napi-rs/canvas + canvafy
- **Auth** — Passport.js + OAuth2

---

## ❤️ Credits

Original project **STFU** created by **@pushp.dev.raj and @craftyraj.exe**.

This project is a modified derivative of STFU with AI and Music features removed,
rebranded as **astryx**, and extended with a webhook auto-setup system.


Made with ❤️ for Discord communities.

