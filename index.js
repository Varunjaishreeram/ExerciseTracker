const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose
  .connect(process.env.url)
  .then(async () => {
    console.log("Connected to MongoDB Atlas");

    // await User.deleteMany({});
    // await Exercise.deleteMany({});
    console.log("All users deleted");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB Atlas", error);
  });

const db = mongoose.connection;

// Define user schema and model
const userSchema = new mongoose.Schema({
  username: String,
  exercises: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
    },
  ],
});

const User = mongoose.model("User", userSchema);

// Define exercise schema and model
const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Define API endpoints
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.create({ username });
    res.json({ username: user.username, _id: user._id });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    // Query the database to retrieve all users
    const users = await User.find({}, "username _id");

    // Return the list of users as an array of objects
    res.json(users);
  } catch (error) {
    // Handle errors
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    // Extract user ID from request parameters
    const { _id } = req.params;

    // Parse form data from request body
    const { description, duration, date } = req.body;

    // If date is not provided, set it to the current date
    const exerciseDate = date ? new Date(date) : new Date();

    // Create a new exercise document
    const exercise = new Exercise({
      description,
      duration,
      date: exerciseDate,
    });

    // Save the exercise document to the database
    await exercise.save();

    // Find the user and update their exercises array
    const user = await User.findByIdAndUpdate(
      _id,
      { $push: { exercises: exercise._id } },
      { new: true }
    );

    const responseExercise = {
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      description: exercise.description,
      duration: exercise.duration,
    };

    // Return the constructed response object
    res.json(responseExercise);
  } catch (error) {
    // Handle errors
    console.error("Error creating exercise:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id);
    
    let { from, to, limit } = req.query;
    limit = limit ? parseInt(limit) : user.exercises.length; // Default to all exercises if limit not provided
    
    const exerciseArray = [];
    let exerciseCounter = 0;
    
    for (let i = 0; i < user.exercises.length; i++) {
      const exercise_id = user.exercises[i];
      
      if (exerciseCounter === limit) {
        break; // Break out of the loop if the limit is reached
      }
      
      try {
        const exercise = await Exercise.findById(exercise_id);
        
        // Check date range if provided
        if ((!from || exercise.date >= new Date(from)) && (!to || exercise.date <= new Date(to))) {
          const dateString = new Date(exercise.date).toDateString();
          exerciseArray.push({ ...exercise.toObject(), date: dateString });
          exerciseCounter++;
        }
      } catch (error) {
        console.error("Error fetching exercise:", error);
      }
    }

    const response = {
      username: user.username,
      count: exerciseArray.length,
      _id: user._id,
      log: exerciseArray,
    };

    // Return the response
    res.json(response);
  } catch (error) {
    // Handle errors
    console.error("Error fetching exercise log:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
