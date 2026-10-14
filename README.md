# To-Do List App

A simple to-do list website. You can add tasks, mark them as done, and delete them. Your tasks are saved in a database, so they are still there when you refresh the page or restart the server.

## What it does

- Add a new task
- See all your tasks in a list
- Mark a task as done
- Delete a task
- Tasks are saved permanently in a database file

## Built with

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js and Express
- **Database:** SQLite (the data is stored in a file called `tasks.db`)

## Project structure

```
Todo-List/
├── public/
│   ├── index.html    → the page you see
│   ├── style.css     → colors and layout
│   └── app.js        → frontend logic (talks to the backend)
├── server.js         → the backend server
├── db.js             → connects to the database
├── tasks.db          → the database file (created automatically)
├── .gitignore
└── package.json
```

## How to run it on your computer

**1. Install Node.js**
Download it from nodejs.org. Check it with:

```bash
node -v
```

**2. Download the project and install packages**

```bash
git clone YOUR_REPO_LINK
cd Todo-List
npm install
```

**3. Start the server**

```bash
node server.js
```

Or, if you have nodemon (it restarts the server when you save a file):

```bash
nodemon server.js
```

You should see: `server is running 3000`

**4. Open the app**
Go to `http://localhost:3000` in your browser.

No extra setup is needed. There is no password or `.env` file, because SQLite stores everything in one file on your computer.

## How it works (in simple words)

1. You type a task on the page and click **Add Task**.
2. `app.js` sends the task to the backend using `fetch`.
3. `server.js` receives it, and `db.js` saves it in the database.
4. When you open the page again, the tasks are loaded from the database and shown.
5. **done** and **delete** work the same way: the page tells the backend, and the backend updates the database.

## Notes

- `tasks.db` holds your personal tasks, so it is not uploaded to GitHub (it is listed in `.gitignore`).
- When someone else runs the project, a fresh empty database is made for them.

## Things I want to add later

- Due dates and priorities
- Projects and labels
- Login and user accounts
- A design closer to the real Todoist

## What I learned

- Building a backend with Node.js and Express
- Saving data in a database
- Connecting a frontend to a backend with `fetch`
- Using `.gitignore` to keep private files out of GitHub
