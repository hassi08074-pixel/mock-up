# Dokodemo Shindan MVP Backend Mock-Up

This repository implements a lightweight MVP backend for the Dokodemo Shindan project. It follows the patched requirements for synchronous keyword-based branching and rule-based scoring, providing a functional API and automated tests.

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

The server starts on port `3000` and exposes the REST API documented below.

### Run tests and type checks

```bash
npm test
npm run lint
```

## API Overview

- `POST /api/auth/register` – Register a new user and receive a JWT.
- `POST /api/auth/login` – Authenticate and receive a JWT.
- `GET /api/templates` – Retrieve the built-in diagnosis templates.
- `POST /api/diagnoses` – Create a diagnosis from a template.
- `GET /player/responses` – Submit responses for the player experience (synchronous branching).
- `POST /player/responses/:sessionId/complete` – Complete a player session and trigger asynchronous scoring.
- `GET /api/results` – View completed results (after the scoring worker finishes).
- `GET /api/results/:id/export/csv` – Export responses and scores as CSV.

The repository includes sample templates and rule-based scoring files under `templates/` and `config/scoring/` respectively.
