import express from "express";

const app = express();
const port = 3045;

// Middleware to parse JSON payloads
app.use(express.json());

// Array to store logs temporarily
let logs = [];

// POST endpoint to receive logs and store them
app.post("/sendLogs", (req, res) => {
  const logData = req.body;
  logs.push(logData); // Add the log to the logs array

  // Send a response back to acknowledge the received log
  res.status(200).send("Log received");
});

// Route to clear logs
app.post("/clearLogs", (req, res) => {
  logs = []; // Reset the logs array
  res.status(200).send("Logs cleared");
});

// SSE endpoint to send updates to the client
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
  res.send(`
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Log Viewer</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      pre {
        background-color: #f4f4f4;
        padding: 10px;
        border-radius: 5px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      h1 {
        color: #333;
      }
      button {
        background-color:rgb(21, 7, 6);
        color: white;
        padding: 10px 20px;
        border: none;
        cursor: pointer;
        border-radius: 5px;
        font-size: 16px;
      }
      button:hover {
        background-color: #d32f2f;
      }
    </style>
  </head>
  <body>
    <h1>Debug Log Viewer</h1>
    <pre id="logs"></pre>

    <button id="clearLogsButton">Clear Logs</button>

    <script>
      const logContainer = document.getElementById('logs');
      const clearLogsButton = document.getElementById('clearLogsButton');

      // Open a connection to the SSE endpoint
      const eventSource = new EventSource('/logs');

      // Listen for updates and update the UI
      eventSource.onmessage = function(event) {
        const logs = JSON.parse(event.data);
        logContainer.textContent = JSON.stringify(logs, null, 2);
      };

      // Add an event listener to clear logs when the button is clicked
      clearLogsButton.addEventListener('click', function() {
        fetch('/clearLogs', {
          method: 'POST'
        })
        .then(response => response.text())
        .then(message => {
          console.log(message); // Logs the response message
          logContainer.textContent = ''; // Clear the logs on the client side
        })
        .catch(error => console.error('Error clearing logs:', error));
      });
    </script>
  </body>
</html>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;
