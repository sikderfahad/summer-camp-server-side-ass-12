const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3zuhxgd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const database = client.db("summerCamp");
    const allClassesCollection = database.collection("all-classes");
    const allTeachersCollection = database.collection("all-teachers");
    const usersCollection = database.collection("all-users");

    // READ: get all popular classes display on homepage
    app.get("/popular-classes", async (req, res) => {
      const result = await allClassesCollection
        .find()
        .sort({ enrolledStudents: -1 })
        .toArray();
      res.send(result);
    });

    // READ: get all popular classes display on homepage
    app.get("/popular-teachers", async (req, res) => {
      const result = await allTeachersCollection
        .find()
        .sort({ enrolledStudents: -1 })
        .toArray();
      res.send(result);
    });

    // CREATE: post a user in db
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      const isExist = await usersCollection.findOne(query);
      // console.log(isExist);
      if (!isExist) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
      // console.log(query, user, isExist);
    });

    // READ: get all user from db
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // UPDATE: modify user role
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role.role,
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Summer Camp is Running...!⚡");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
