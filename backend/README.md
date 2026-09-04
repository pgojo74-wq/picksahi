# Secure backend

This is a Fastify + TypeScript + PostgreSQL API for the PICSOME affiliate website. It does not contain payment collection, payment forms, card data handling, payment-gateway integration, or order processing.

## Start locally

1. Copy `.env.example` to `.env` and replace both JWT secrets with different random values of at least 32 characters.
2. Create a PostgreSQL database and use a least-privilege application user in `DATABASE_URL`.
3. Run `npm install`, `npm run db:migrate`, then `npm run dev` from this directory.
4. The API health check is `GET /health`.

## API endpoints

- `POST /api/v1/auth/register` — `{ email, password, fullName }`
- `POST /api/v1/auth/login` — `{ email, password }`
- `POST /api/v1/auth/refresh` — `{ refreshToken }`
- `POST /api/v1/auth/logout` — Bearer access token required
- `GET /api/v1/categories` — active public categories\n- `GET /api/v1/products` — active public affiliate products\n- `POST /api/v1/newsletter/subscribers` — creates or reactivates a newsletter subscription

## Production notes

- Set `NODE_ENV=production`, use HTTPS and allow only the real frontend URL in `ALLOWED_ORIGINS`.
- Keep `.env` in a secret manager; never expose JWT or database credentials to the browser.
- Use a managed PostgreSQL backup policy and run migrations as a separate deployment step.
- Amazon-facing status updates must eventually arrive via a verified server-to-server adapter. Do not expose an unauthenticated public endpoint for payment status changes.
