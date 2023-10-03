## Prerequisites

Before you begin, ensure you have the following software and tools installed:

- Node.js
- pnpm

## Install dependencies.

```
pnpm install
```

## Environment Configuration

```
cp .env.sample .env
```

Set the required environment variables

## Build

```
pnpm build
```

## Usage

```
node dist/index.js
```

### dry-run

```
node dist/index.js --dry-run
```

## Usage GitHub Actions

If you intend to run this project using GitHub Actions, you will need to configure environment variables.

- `DISCORD_WEBHOOK_URL`: Discord Webhook URL
- `CLOUDFLARE_R2_ACCOUNT_ID`: Cloudflare R2 Account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID`: Cloudflare R2 Access Key ID
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: Cloudflare R2 Secret Access Key
- `CLOUDFLARE_R2_BUCKET`: The Cloudflare R2 bucket you intend to use
