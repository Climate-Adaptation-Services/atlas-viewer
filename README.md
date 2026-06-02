# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Setup

Before running the project, create a `.env` file in the project root with your Hetzner Object Storage credentials:

```bash
cp .env.example .env
```

Then open `.env` and fill in the values:

```
HETZNER_ACCESS_KEY=<your-access-key>
HETZNER_SECRET_KEY=<your-secret-key>
```

You can find these in the Hetzner Cloud Console under **Object Storage → Access Keys**. The CSV data for the popup charts is fetched from S3-compatible buckets (`kenya-csv-data`, `zimbabwe-csv-data`) — without valid credentials the popup charts will not load.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
