# Nu Dev Lens

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Docker](https://docs.docker.com/get-docker/)

### Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment variables:**

   Copy `.env.example` to `.env` and update the values as needed.

3. **Start the database** (see section below)

4. **Run database migrations:**

   ```bash
   bun run db:push
   ```

5. **Start the development server:**

   ```bash
   bun run dev
   ```

## Database

This project uses PostgreSQL running in Docker. The database runs on **port 5433** (not the default 5432) to avoid conflicts with other local databases.

### Start the database

```bash
docker compose up -d
```

### Stop the database

```bash
docker compose down
```

### View database logs

```bash
docker compose logs
```

### Database connection details

| Setting  | Value       |
| -------- | ----------- |
| Host     | localhost   |
| Port     | 5433        |
| User     | postgres    |
| Password | password    |
| Database | nu_dev_lens |

The connection string in `.env` is:

```
postgresql://postgres:password@localhost:5433/nu_dev_lens
```

## Tech Stack

- [Next.js](https://nextjs.org)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

## Deployment

Follow the deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
