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

app.get("/random", async (req, res) => {
  console.log(
    `${clc.yellow(`${getLogTimestamp()} Received request for random board`)}`
  );
  const board = await getBoard();
  if (!board) {
    return res.status(500).json({
      message: "Error fetching board",
    });
  }
  console.log(
    `${clc.green(`${getLogTimestamp()} Fetched board:`)} ${clc.blue(
      JSON.stringify(board)
    )}`
  );
  const boardID = await storeBoard(board);
  const jsonResponse = {
    id: boardID,
    value: board.value,
    difficulty: board.difficulty,
  };
  setTimeout(async () => {
    res.json(jsonResponse);
  }, 1000);
});

app.get("/daily", async (req, res) => {
  let { data: boards, error } = await supabase
    .from("boards")
    .select("id, unsolved")
    .eq("difficulty", req.query.difficulty.toString().toUpperCase())
    .eq("is_daily", true)
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
  setTimeout(async () => {
    res.json(jsonResponse);
  }, 1000);
});

app.post("/solve", async (req, res) => {
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
    .eq("id", req.body.boardID);
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

/**
 * Retrieves a Sudoku board with the specified difficulty.
 * Keeps trying until a board with the desired difficulty is found.
 *
 * @param {string} difficulty - The desired difficulty level
 * @returns {Promise<Object>} A promise that resolves to the board object
 */
async function getBoard(difficulty = "any") {
  const targetDifficulty = difficulty.toLowerCase();

  while (true) {
    try {
      const response = await fetch(`https://sudoku-api.vercel.app/api/dosuku`);
      const data = await response.json();

      console.log(
        `Retrieved board with difficulty: ${data.newboard.grids[0].difficulty}`
      );
      if (
        (data.newboard.grids[0].difficulty &&
          data.newboard.grids[0].difficulty.toLowerCase() ===
            targetDifficulty) ||
        targetDifficulty === "any"
      ) {
        console.log(
          `Found board with desired difficulty: ${data.newboard.grids[0].difficulty}`
        );
        return data.newboard.grids[0];
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error("Error:", error);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function storeBoard(board, isDaily = false) {
  const { value, solution } = board;
  const { data, error } = await supabase
    .from("boards")
    .insert([
      {
        unsolved: value,
        solution: solution,
        difficulty: board.difficulty.toUpperCase(),
        is_daily: isDaily,
      },
    ])
    .select("id");

  if (error) {
    console.error("Error inserting board:", error);
    throw error;
  } else {
    console.log("Board inserted:", data);
    return data[0].id;
  }
}
