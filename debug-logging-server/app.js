import express from "express";

const app = express();
const port = 3045;

// Middleware to parse JSON payloads
app.use(express.json());

// Set the view engine to Jade
app.set("view engine", "jade");

// Array to store logs temporarily
let logs = [];

// POST endpoint to receive logs and store them
app.post("/sendLogs", (req, res) => {
  const logData = req.body;
  logs.push(logData);
  res.status(200).send("Log received");
});

// Route to clear logs
app.post("/clearLogs", (req, res) => {
  logs = [];
  res.status(200).send("Logs cleared");
});

app.get("/logs", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Function to send the latest logs to the client
  const sendLogs = () => {
    res.write(`data: ${JSON.stringify(logs)}\n\n`);
  };

  // Send the logs initially
  sendLogs();

  // Set an interval to send the logs every 1 second
  const intervalId = setInterval(sendLogs, 1000);

  // Clean up the interval when the client disconnects
  req.on("close", () => {
    clearInterval(intervalId);
  });
});

// Serve a simple HTML page that connects to the SSE endpoint
app.get("/", (req, res) => {
  res.render("index");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

export default app;
