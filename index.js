require("dotenv").config();
const express = require("express");
const clc = require("cli-color");
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error(
    "Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
const port = process.env.PORT || 3000;
app.enable("trust proxy");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(LogConnections);

app.get("/board", async (req, res) => {
  let { data: boards, error } = await supabase
    .from("boards")
    .select("id, unsolved")
    .eq("difficulty", req.query.difficulty)
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .lte(
      "created_at",
      new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
    );
  if (error) {
    console.error(
      `${clc.red(`${getLogTimestamp()} Error fetching board:`)} ${clc.red(
        error.message
      )}`
    );
    return res.status(500).json({
      message: "Error fetching board",
    });
  }
  if (!boards || boards.length === 0) {
    console.log(
      `${clc.yellow(`${getLogTimestamp()} No board found in database`)}`
    );
    return res.status(404).json({
      message: "No board found",
    });
  }
  console.log(
    `${clc.green(`${getLogTimestamp()} Fetched board:`)} ${clc.blue(
      JSON.stringify(boards[0])
    )}`
  );
  const unsolvedBoard = boards[0];
  const jsonResponse = {
    id: unsolvedBoard.id,
    value: unsolvedBoard.unsolved,
  };
  res.json(jsonResponse);
});

app.post("/solved", async (req, res) => {
  console.log(
    `${clc.yellow(
      `${getLogTimestamp()} Board ID: ${clc.cyanBright(
        req.boardID
      )} Received board:`
    )} ${clc.blue(JSON.stringify(req.body.board))}`
  );
  if (!req.body.board) {
    return res.status(400).json({
      message: "No board provided",
    });
  }

  let { data: boards, error } = await supabase
    .from("boards")
    .select("solution")
    .eq("id", req.body.boardID)
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .lte(
      "created_at",
      new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
    );
  if (error) {
    console.error(
      `${clc.red(`${getLogTimestamp()} Error fetching board:`)} ${clc.red(
        error.message
      )}`
    );
    return res.status(500).json({
      message: "Error fetching board",
    });
  }
  if (!boards || boards.length === 0) {
    console.log(
      `${clc.yellow(`${getLogTimestamp()} No board found in database`)}`
    );
    return res.status(404).json({
      message: "No board found",
    });
  }
  console.log(
    `${clc.green(`${getLogTimestamp()} Fetched board:`)} ${clc.blue(
      JSON.stringify(boards[0])
    )}`
  );

  if (JSON.stringify(req.body.board) === JSON.stringify(boards[0].solution)) {
    return res.status(200).json({
      message: "Board solved",
      board: boards[0].solution,
    });
  }

  return res.status(400).json({
    message: "Board not solved",
  });
});

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

/**
 * Retrieves the true IP address from the request object.
 * @param {Object} req - The request object.
 * @returns {string} The true IP address.
 */
function getTrueIP(req) {
  return req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(",")[0]
    : req.socket.remoteAddress.replace("::ffff:", "");
}
