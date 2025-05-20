# Waffle Test Submission Backend API

Backend API service for the Waffle Sudoku frontend. This service provides endpoints for retrieving random and daily Sudoku boards, checking solutions, and getting hints.

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Supabase account and project

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
# Create a .env file with the following variables:
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_key

# Start the server
npm start

# For development with auto-restart
npm run dev
```

## API Endpoints

### Get Random Board

Retrieves a random Sudoku board.

- **URL**: `/random`
- **Method**: `GET`
- **URL Parameters**: None

#### Success Response

```json
{
  "id": "123",
  "value": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ],
  "difficulty": "Medium"
}
```

#### Error Response

```json
{
  "message": "Error fetching board"
}
```

### Get Daily Board

Retrieves the daily Sudoku board for a specific difficulty level.

- **URL**: `/daily`
- **Method**: `GET`
- **URL Parameters**:
  - `difficulty`: The difficulty level (Easy, Medium, Hard)

#### Request Example

```
GET /daily?difficulty=Medium
```

#### Success Response

```json
{
  "id": "23",
  "value": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ]
}
```

#### Error Responses

```json
{
  "message": "Error fetching board"
}
```

```json
{
  "message": "No board found"
}
```

### Check Solution

Checks if a provided board solution is correct.

- **URL**: `/solve`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Payload

```json
{
  "boardID": "234",
  "board": [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ]
}
```

#### Success Response (Correct Solution)

```json
{
  "message": "Board solved",
  "board": [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
  ]
}
```

#### Error Responses

```json
{
  "message": "Board not solved"
}
```

```json
{
  "message": "No board provided"
}
```

```json
{
  "message": "No board found"
}
```

```json
{
  "message": "Error fetching board"
}
```

### Get Hint

Provides a hint for a specific position on the board.

- **URL**: `/hint`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Payload

```json
{
  "boardID": "21",
  "board": [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ]
}
```

#### Success Response

```json
{
  "parentCellIndex": 0,
  "innerCellIndex": 2,
  "hint": 4
}
```

In this example, the hint is for the cell at position [0][2] (first row, third column) and the correct value is 4.

#### Error Responses

```json
{
  "message": "No hint available"
}
```

```json
{
  "message": "No board provided"
}
```

```json
{
  "message": "No board found"
}
```

```json
{
  "message": "Error fetching board"
}
```

## Technical Details

- Built with Express.js
- Uses Supabase for database storage
- Scheduled job runs at midnight to generate new daily boards
- CORS enabled for specific origins
