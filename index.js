import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL;

app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongodb connected!!💖");

  return client;
}

const client = await createConnection();

// movies endpoints:
app.get("/", async (request, response) => {
  if (request.query.rating) {
    request.query.rating = +request.query.rating;
  }

  const result = await client
    .db("Hackathon")
    .collection("movies")
    .find(request.query)
    .toArray();
  response.send(result);
});

app.post("/add-movie", async (request, response) => {
  const data = request.body;
  const result = await client
    .db("Hackathon")
    .collection("movies")
    .insertOne(data);

  result.acknowledged
    ? response.send({ msg: "movie added sucessfully!!" })
    : response.status(404).send({ msg: "movie not found" });
});

app.put("/movies/:id", async (request, response) => {
  const { id } = request.params;
  const data = request.body;
  const result = await client
    .db("Hackathon")
    .collection("movies")
    .updateOne({ id: id }, { $set: data });

  result.modifiedCount > 0
    ? response.send({ msg: "movie updated sucessfully!!" })
    : response.status(404).send({ msg: "movie not found" });
});

app.delete("/movies/:id", async (request, response) => {
  const { id } = request.params;

  const movie = await client
    .db("Hackathon")
    .collection("movies")
    .deleteOne({ id: id });

  movie.deletedCount > 0
    ? response.send({ msg: "movie deleted sucessfully!!" })
    : response.status(404).send({ msg: "movie not found" });
});

// users endpoints:
async function getHashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

async function checkUser(username) {
  return await client.db("Hackathon").collection("users").findOne({ username });
}

app.post("/signup", async (request, response) => {
  const { username, password } = request.body;
  const isUserExist = await checkUser(username);

  if (isUserExist) {
    response.send({ msg: "user already exists!!" });
  } else if (password.length < 8) {
    response.send({ msg: "password must be more than 8 characters!!" });
  } else if (username.length < 5) {
    response.send({ msg: "username must be more than 4 characters long!!" });
  } else {
    const hashedPassword = await getHashedPassword(password);
    const result = await client.db("Hackathon").collection("users").insertOne({
      username,
      password: hashedPassword,
    });

    result.acknowledged
      ? response.send({ msg: "Account created successfully!!" })
      : response.send({ msg: "Username already exists!!" });
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const isUserExist = await checkUser(username);

  if (!isUserExist) {
    if (password.length < 8) {
      response.send({ msg: "password must be more than 8 characters!!" });
    } else {
      const storedPassword = isUserExist.password;
      const isPasswordMatch = await bcrypt.compare(password, storedPassword);

      if (isPasswordMatch) {
        const token = jwt.sign({ id: isUserExist._id }, process.env.SECRET_KEY);
        response.status(200).send({ msg: "login suxxessful!!" });
      } else {
        response.send({ msg: "Incorrect credentials!!" });
      }
    }
  } else {
    response.send({msg:"please sign up!!"})
  }
});

// ticket endpoints:
app.get("/tickets", async (request, response) => {
  if (request.query.rating) {
    request.query.rating = +request.query.rating;
  }

  const result = await client
    .db("Hackathon")
    .collection("tickets")
    .find(request.query)
    .toArray();
  response.send(result);
});

app.post("/add-ticket", async (request, response) => {
  const data = request.body;
  const result = await client
    .db("Hackathon")
    .collection("tickets")
    .insertOne(data);

  result.acknowledged
    ? response.send({ msg: "ticket generated sucessfully!!" })
    : response.status(404).send({ msg: "Something went wrong !!" });
});

app.listen(PORT, () => console.log(`App started in ${PORT}`));
