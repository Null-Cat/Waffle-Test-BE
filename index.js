require("dotenv").config();
const express = require("express");
const cors = require("cors");
const clc = require("cli-color");
const schedule = require("node-schedule");
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
const port = process.env.PORT || 3600;
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost",
      "https://waffle.philipwhite.dev",
      "https://waffle.philipwhite.dev:443",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
app.enable("trust proxy");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(LogConnections);

// Retrieve the daily boards every day at midnight
schedule.scheduleJob("0 0 * * *", async () => {
  console.log(`${clc.yellow(`${getLogTimestamp()} Scheduled job running...`)}`);
  const difficulties = ["Easy", "Medium", "Hard"];
  for (const difficulty of difficulties) {
    console.log(
      `${clc.yellow(
        `${getLogTimestamp()} Fetching daily board with difficulty: ${difficulty}`
      )}`
    );
    const board = await getBoard(difficulty);
    if (!board) {
      return console.error(
        `${clc.red(`${getLogTimestamp()} Error fetching board`)}`
      );
    }
    console.log(
      `${clc.green(`${getLogTimestamp()} Fetched board:`)} ${clc.blue(
        JSON.stringify(board)
      )}`
    );
    const boardID = await storeBoard(board, true);
    console.log(
      `${clc.green(
        `${getLogTimestamp()} Stored daily board with ID:`
      )} ${clc.blue(boardID)}`
    );
  }
});

// Endpoint to retrieve a random board
// This endpoint is used by the client to get a random board
// It will fetch a board from the API and store it in the database
// It will return the ID of the board and the difficulty
// The client will use this ID to retrieve the board later
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

// Endpoint to retrieve a daily board
// This endpoint is used by the client to get a daily board
// It will fetch a board from the database and return it
// It will return the ID of the board and the unsolved state
// The client will use this ID to retrieve the board later
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

// Endpoint to check if a board is solved
// This endpoint is used by the client to check if a board is solved
// It will fetch the board from the database and compare it to the provided board
// It will return a 200 status if the board is solved, 400 if not
// It will return a 404 status if the board is not found
// It will return a 500 status if there is an error fetching the board
// It will return a 400 status if no board is provided
// It will return a 400 status if the board is not solved
app.post("/solve", async (req, res) => {
  console.log(
    `${clc.yellow(
      `${getLogTimestamp()} Board ID: ${clc.cyanBright(
        req.body.boardID
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

// Endpoint to obtain a hint for the board
// This endpoint is used by the client to get a hint for the board
// It will fetch the board from the database and compare it to the provided board
// It will return a 200 status if a hint is available along with the hint which comprises of the cell index and the hint value
// It will return a 400 status if no hint is available
// It will return a 404 status if the board is not found
// It will return a 500 status if there is an error fetching the board
// It will return a 400 status if no board is provided
app.post("/hint", async (req, res) => {
  console.log(
    `${clc.yellow(
      `${getLogTimestamp()} Board ID: ${clc.cyanBright(
        req.body.boardID
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

  for (let i = 0; i < req.body.board.length; i++) {
    for (let j = 0; j < req.body.board[i].length; j++) {
      if (req.body.board[i][j] === 0) {
        req.body.board[i][j] = boards[0].solution[i][j];
        console.log(
          `${clc.green(
            `${getLogTimestamp()} Hint provided for cell [${i}][${j}]: ${
              boards[0].solution[i][j]
            }`
          )}`
        );
        return res.status(200).json({
          parentCellIndex: i,
          innerCellIndex: j,
          hint: boards[0].solution[i][j],
        });
      }
    }
  }

  return res.status(400).json({
    message: "No hint available",
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

/**
 * Stores a board in the database using Supabase.
 *
 * @async
 * @param {Object} board - The board to store
 * @param {string} board.value - The unsolved state of the board
 * @param {string} board.solution - The solved state of the board
 * @param {string} board.difficulty - The difficulty level of the board (will be converted to uppercase)
 * @param {boolean} [isDaily=false] - Whether this board is a daily challenge
 * @returns {Promise<number|string>} The ID of the stored board
 * @throws {Error} If there's an error inserting the board into the database
 */
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
