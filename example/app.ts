import express, { type Request, type Response } from "express";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const API_HOST = process.env.API_HOST as string;
const USER_ID = process.env.USER_ID as string;
const APP_KEY = process.env.APP_KEY as string;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all("/*", async (req: Request, res: Response) => {
  try {
    // Exclude 'host' header
    const requestHeaders: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() !== "host") {
        requestHeaders[key] = value as string;
      }
    }
    requestHeaders["x-iowallet-user-id"] = USER_ID;
    requestHeaders["x-functions-key"] = APP_KEY;

    const apiUrl = req.url.replace(req.baseUrl, API_HOST);

    const axiosResponse = await axios({
      method: req.method,
      url: apiUrl,
      headers: requestHeaders,
      data: req.body,
      params: req.query,
      maxRedirects: 0,
      validateStatus: () => true, // Allow handling of all status codes
    });

    // Exclude some headers from the response
    const excludedHeaders = [
      "content-encoding",
      "content-length",
      "transfer-encoding",
      "connection",
    ];
    const responseHeaders: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(axiosResponse.headers)) {
      if (!excludedHeaders.includes(key.toLowerCase())) {
        responseHeaders[key] = value as string;
      }
    }

    res
      .status(axiosResponse.status)
      .set(responseHeaders)
      .send(axiosResponse.data);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
