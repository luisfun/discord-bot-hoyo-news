⚠️ I think that you need a paid plan for workers to run this program on cloudflare.

## 🚀 Getting Started

### 0. Environment Installation

[<img alt="Git" src="https://img.shields.io/badge/Git-windows-%23F05032?logo=Git" />](https://gitforwindows.org)
[<img alt="Node.js" src="https://img.shields.io/badge/Node.js-20.x-%23339933?logo=Node.js" />](https://nodejs.org)

### 1. Clone and Install

```shell
git clone https://github.com/LuisFun/discord-bot-hoyo-news discord-bot-hoyo-news
cd discord-bot-hoyo-news
npm i
```

### 2. Set Environment Variables

Create a New Application from [Dashboard](https://discord.com/developers/applications).

#### 2.1 Set Local

Rename the file `example.dev.var` and create a `.dev.var` file.

Enter information in `.dev.var`, referring to the [Official Docs](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers).

#### 2.2 Set Workers

```shell
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
```

### 3. Register Commands and Deploy

```shell
npm run register
npm run deploy
```

### 4. Set Endpoint URL

Enter `https://discord-bot-hoyo-news.YOUER_DOMAIN.workers.dev` in the [INTERACTIONS ENDPOINT URL](https://discord.com/developers/applications).

## 📑 Official Docs

[Discord Bot](https://discord.com/developers/docs/tutorials/hosting-on-cloudflare-workers)
