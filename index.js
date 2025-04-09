const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

exports.main_handler = async (event, context) => {
  try {
    await app.prepare();

    const req = {
      url: event.path + (event.queryString ? `?${event.queryString}` : ""),
      method: event.httpMethod,
      headers: event.headers,
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: "",
      send: function (body) {
        this.body = body;
      },
      setHeader: function (key, value) {
        this.headers[key] = value;
      },
      end: function () {
        return {
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
        };
      },
    };

    await handle(req, res, parse(req.url, true));
    return res.end();
  } catch (err) {
    console.error("Error handling request:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: "Internal Server Error",
    };
  } finally {
    console.log("== test test");
  }
};
