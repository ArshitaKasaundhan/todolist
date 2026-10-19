# Todo List

A simple full-stack todo list app. Add tasks, mark them done or undo them, and delete them. Tasks are stored in a PostgreSQL database running in Docker, so they stay saved after a restart.

## Tech Stack

- **Backend:** Node.js, Express 5
- **Database:** PostgreSQL 16 (Docker), `pg` driver
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Config:** dotenv

## Features

- Add a task
- Mark a task as done / undo
- Delete a task
- Data persists in PostgreSQL (Docker volume)
- Input validation and parameterized queries (protects against SQL injection)

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)

## Setup

1. Clone the repo and install dependencies:

```bash
   git clone https://github.com/arshita2025/todolist.git
   cd todolist
   npm install
```

2. Create your `.env` file from the example and set your own password
   (use the same password in both `POSTGRES_PASSWORD` and `DATABASE_URL`):

```bash
   cp .env.example .env
```

3. Start PostgreSQL:

```bash
   docker compose up -d
   docker compose ps
```

Wait until `todo-postgres` shows `healthy`.

4. Start the app:

```bash
   npm run dev
```

5. Open http://localhost:3000

The `tasks` table is created automatically on the first run.

## Environment Variables

| Variable            | Description                                  | Example                                                            |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `POSTGRES_USER`     | Database user                                | `todo_user`                                                        |
| `POSTGRES_PASSWORD` | Database password                            | `your_password_here`                                               |
| `POSTGRES_DB`       | Database name                                | `todo_db`                                                          |
| `POSTGRES_PORT`     | Port on your machine mapped to the container | `5433`                                                             |
| `DATABASE_URL`      | Connection string used by the app            | `postgresql://todo_user:your_password_here@localhost:5433/todo_db` |
| `PORT`              | Port the Express server runs on              | `3000`                                                             |

The `.env` file is ignored by git. Never commit it.

## API Endpoints

| Method   | Endpoint     | Body                       | Description                |
| -------- | ------------ | -------------------------- | -------------------------- |
| `GET`    | `/tasks`     | none                       | Get all tasks              |
| `POST`   | `/tasks`     | `{ "title": "Buy milk" }`  | Create a task              |
| `PATCH`  | `/tasks/:id` | `{ "is_completed": true }` | Mark a task done or undone |
| `DELETE` | `/tasks/:id` | none                       | Delete a task              |

Example:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"first task"}'
```

## Database Schema

```sql
CREATE TABLE tasks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE
);
```

## Useful Docker Commands

```bash
docker compose up -d        # start the database
docker compose stop         # stop it (data is kept)
docker compose down         # remove the container (data is kept)
docker compose down -v      # remove the container AND all data
docker compose logs postgres
```

Open the database shell:

```bash
docker exec -it todo-postgres psql -U todo_user -d todo_db
```

## Troubleshooting

- **`port is already allocated`:** another Postgres is using the port. Change `POSTGRES_PORT` in `.env` (and the port in `DATABASE_URL`).
- **`password authentication failed`:** the password in `.env` does not match the one the database volume was created with. Run `docker compose down -v` and `docker compose up -d` to recreate it.
- **`failed to connect to the docker API`:** Docker Desktop is not running. Start it and try again.
- **`ECONNREFUSED`:** the database container is not running. Run `docker compose up -d`.

## Project Structure

```
.
├── docker-compose.yml   # PostgreSQL container
├── db.js                # database connection and table setup
├── server.js            # Express server and API routes
├── public/              # frontend (HTML, CSS, JS)
├── .env.example         # example environment variables
└── package.json
```
