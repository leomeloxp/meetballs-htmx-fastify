import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import Database from "better-sqlite3";
import Fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";

// Get the current file path and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
const db = new Database("todos.db");

// Create todos table if it doesn't exist
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0
  )
`
).run();

const fastify = Fastify({
  logger: true,
});

// Register the CORS plugin
fastify.register(fastifyCors, {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
});

// Register the form body plugin
fastify.register(fastifyFormbody);

// Register the static plugin to serve HTML files
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/public/", // optional: default '/'
});

// Declare a route to serve the HTML file
fastify.get("/", function (request, reply) {
  reply.sendFile("index.html"); // serving index.html from the public directory
});

fastify.post("/todos/new", function (request, reply) {
  const { task } = request.body;
  db.prepare("INSERT INTO todos (task) VALUES (?)").run(task);
  reply.type("text").send(renderTodos());
});
fastify.get("/todos", function (request, reply) {
  reply.type("text").send(renderTodos());
});

fastify.put("/todos/:id/toggle", function (request, reply) {
  const { id } = request.params;
  const todo = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
  if (todo) {
    db.prepare("UPDATE todos SET completed = ? WHERE id = ?").run(!todo.completed ? 1 : 0, id);
  }
  reply.type("text").send(renderTodos());
});

fastify.delete("/todos/:index", function (request, reply) {
  const { index } = request.params;
  db.prepare("DELETE FROM todos WHERE id = ?").run(index);
  reply.type("text").send(renderTodos());
});

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  // Server is now listening on ${address}
});

function renderTodos() {
  const todos = db.prepare("SELECT * FROM todos").all();
  return todos.map(renderTodo).join("\n");
}

function renderTodo(todo) {
  return `<li class="flex items-center space-x-2 py-1">
    <input 
      type="checkbox" 
      name="todo" 
      value="todo" 
      class="mr-2"
      hx-put="/todos/${todo.id}/toggle"
      hx-target="#todos"
      hx-trigger="click"
      ${todo.completed ? "checked" : ""}
    >
    <span>${todo.task}(${todo.id})</span>
    <button 
      hx-target="#todos" 
      hx-delete="/todos/${todo.id}" 
      class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
    >
      &times;
    </button>
  </li>`;
}
