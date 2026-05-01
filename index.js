const fs = require("fs");
const http = require("http");
const url = require("url");
const zlib = require("zlib");
const { pipeline } = require("stream");

const readStream = fs.createReadStream("./big.txt", {
  encoding: "utf-8",
  highWaterMark: 16 // chunk size
});

readStream.on("data", (chunk) => {
  console.log("Chunk:", chunk);
});

readStream.on("end", () => {
  console.log("Finished reading file");
});

const readStream = fs.createReadStream("./source.txt");
const writeStream = fs.createWriteStream("./dest.txt");

readStream.pipe(writeStream);

pipeline(
  fs.createReadStream("./data.txt"),
  zlib.createGzip(),
  fs.createWriteStream("./data.txt.gz"),
  (err) => {
    if (err) console.log("Error:", err);
    else console.log("File compressed successfully");
  }
);

const filePath = "./users.json";

// helper functions
const readUsers = () => {
  return JSON.parse(fs.readFileSync(filePath));
};

const writeUsers = (data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const path = parsedUrl.pathname;

  // GET ALL USERS
  if (method === "GET" && path === "/user") {
    const users = readUsers();
    res.end(JSON.stringify(users));
  }

  // GET USER BY ID
  else if (method === "GET" && path.startsWith("/user/")) {
    const id = path.split("/")[2];
    const users = readUsers();

    const user = users.find(u => u.id == id);

    if (user) res.end(JSON.stringify(user));
    else res.end(JSON.stringify({ message: "User not found" }));
  }

  // CREATE USER
  else if (method === "POST" && path === "/user") {
    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", () => {
      const newUser = JSON.parse(body);
      const users = readUsers();

      const exists = users.find(u => u.email === newUser.email);

      if (exists) {
        return res.end(JSON.stringify({ message: "Email already exists" }));
      }

      newUser.id = Date.now();
      users.push(newUser);

      writeUsers(users);

      res.end(JSON.stringify({ message: "User added successfully" }));
    });
  }

  // UPDATE USER
  else if (method === "PATCH" && path.startsWith("/user/")) {
    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", () => {
      const updates = JSON.parse(body);
      const id = path.split("/")[2];

      const users = readUsers();
      const index = users.findIndex(u => u.id == id);

      if (index === -1) {
        return res.end(JSON.stringify({ message: "User ID not found" }));
      }

      users[index] = { ...users[index], ...updates };

      writeUsers(users);

      res.end(JSON.stringify({ message: "User updated successfully" }));
    });
  }

  // DELETE USER
  else if (method === "DELETE" && path.startsWith("/user/")) {
    const id = path.split("/")[2];
    let users = readUsers();

    const filtered = users.filter(u => u.id != id);

    if (filtered.length === users.length) {
      return res.end(JSON.stringify({ message: "User ID not found" }));
    }

    writeUsers(filtered);

    res.end(JSON.stringify({ message: "User deleted successfully" }));
  }

  else {
    res.end("Route not found");
  }
});

server.listen(3000, () => console.log("Server running on port 3000"));
/*
1. What is the Node.js Event Loop? (0.5 Grade)
The Event Loop is the core mechanism in Node.js that allows it to handle multiple operations efficiently using a single thread.
It continuously checks:
If the call stack is empty
If there are pending callbacks in the queue
Then it pushes callbacks from the queue into the call stack for execution.
In simple terms:It’s what makes Node.js non-blocking and asynchronous, enabling it to handle many requests without creating multiple threads.
____________________________________________________________________________________
2. What is Libuv and What Role Does It Play in Node.js? (0.5 Grade)
Libuv is a C library that Node.js uses under the hood.
Its main responsibilities:
Managing the event loop
Handling asynchronous I/O operations (files, network, etc.)
Providing a thread pool for heavy tasks
Think of it as the engine that powers Node.js async behavior.
____________________________________________________________________________________
3. How Does Node.js Handle Asynchronous Operations Under the Hood? (0.5 Grade)
Node.js uses:
The Event Loop
Libuv
A thread pool (for heavy operations)
Process:
Async task is sent to Libuv
If it’s I/O → handled by OS
If it’s heavy (e.g. file system, crypto) → sent to thread pool
Once finished → callback goes to event queue
Event loop moves it to call stack when ready
Result: Node.js keeps running without waiting (non-blocking).
____________________________________________________________________________________
4. Difference Between Call Stack, Event Queue, and Event Loop (0.5 Grade)
Call Stack
Executes functions (LIFO structure).
Only one task runs at a time.
Event Queue (Callback Queue)
Holds callbacks from completed async operations.
Event Loop
The controller:
Monitors the stack
Moves callbacks from queue → stack
Summary:
Stack = execution
Queue = waiting tasks
Loop = manager
____________________________________________________________________________________
5. What is the Node.js Thread Pool and How to Set Its Size? (0.5 Grade)
The thread pool is used by Libuv to handle CPU-heavy or blocking operations, such as:
File system (fs)
Crypto
DNS
Default size: 4 threads
You can change it using environment variable:
UV_THREADPOOL_SIZE=8 node app.js
Increasing it helps when handling many heavy operations simultaneously.
/____________________________________________________________________________________
6. How Does Node.js Handle Blocking and Non-Blocking Code Execution? (0.5 Grade)
Blocking Code
Executes synchronously
Stops execution until finished
Example: large loops, sync file read
Non-Blocking Code
Executes asynchronously
Delegates tasks to Libuv / OS
Uses callbacks, promises, async/await
 Example:
// Blocking
const data = fs.readFileSync('file.txt');
// Non-blocking
fs.readFile('file.txt', (err, data) => {});
Node.js avoids blocking by offloading work and using the event loop.
*/
