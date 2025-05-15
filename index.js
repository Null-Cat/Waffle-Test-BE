const express = require("express");
const clc = require("cli-color");

const app = express();
const port = process.env.PORT || 3000;
app.enable("trust proxy");
app.use(express.urlencoded({ extended: true }));

app.use(LogConnections);

app.listen(port, () => {
  console.log(`${clc.green(`${getLogTimestamp()} Listening on port ${port}`)}`);
});

/**
 * Middleware function to log incoming connections.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
function LogConnections(req, res, next) {
  console.log(
    `${getLogTimestamp()} ${clc.inverse(
      req.method
    )} request for ${clc.underline(req.url)} from ${clc.cyan(getTrueIP(req))}`
  );
  next();
}

/**
 * Returns a formatted timestamp for logging purposes.
 * @returns {string} The formatted timestamp in the format MM/DD/YYYY:HH:MM:SS.
 */
function getLogTimestamp() {
  let date = new Date();
  let timeStamp =
    ("00" + (date.getMonth() + 1)).slice(-2) +
    "/" +
    ("00" + date.getDate()).slice(-2) +
    "/" +
    date.getFullYear() +
    ":" +
    ("00" + date.getHours()).slice(-2) +
    ":" +
    ("00" + date.getMinutes()).slice(-2) +
    ":" +
    ("00" + date.getSeconds()).slice(-2);
  return timeStamp;
}
