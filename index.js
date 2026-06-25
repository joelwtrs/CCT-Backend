require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");

const apiRoutes = require("./routes/apiRoutes");
const app = express();
const port = 3000;

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  morgan(
    ":date :method :url :status :res[content-length] - :response-time ms",
    {
      stream: fs.createWriteStream("./logs/access.log", { flags: "a" }),
    },
  ),
);
app.use(
  morgan(":date :method :url :status :res[content-length] - :response-time ms"),
);

//routes
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
