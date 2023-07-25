const express = require("express");
require("dotenv").config();
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRATE_KEY);

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
    const addClassCollection = database.collection("add-classes");
    const userSelectedCollection = database.collection("booking-classes");
    const paymentCollection = database.collection("payments");

    /*------------------------------------
                Only view page
    ------------------------------------*/

    // READ: get all popular classes display on homepage
    app.get("/popular-classes", async (req, res) => {
      const result = await allClassesCollection
        .find()
        .sort({ enrolledStudents: -1 })
        .toArray();
      res.send(result);
    });

    // READ: get all instructors display on instructors page
    app.get("/instructors", async (req, res) => {
      const result = await usersCollection
        .find({ role: "instructor" })
        .toArray();
      res.send(result);
    });

    // READ: get all popular teachers display on homepage
    app.get("/popular-teachers", async (req, res) => {
      const result = await allTeachersCollection
        .find()
        .sort({ enrolledStudents: -1 })
        .toArray();
      res.send(result);
    });

    /*------------------------------------
          Student Operation Start
    ------------------------------------*/

    // CREATE: a student book a class
    app.post("/booking-class", async (req, res) => {
      const classInfo = req.body;
      const result = await userSelectedCollection.insertOne(classInfo);
      res.send(result);

      // console.log(result);
    });

    // READ: get all booking class when a student select this
    app.get("/booking-class", async (req, res) => {
      const email = req.query.email;
      const query = { studentEmail: email };
      const result = await userSelectedCollection.find(query).toArray();
      res.send(result);
    });

    // READ: get a specific class, which for payment
    app.get("/booking-class-payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userSelectedCollection.findOne(query);
      res.send(result);
    });

    // DELETE: remove a class from booking list
    app.delete("/booking-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userSelectedCollection.deleteOne(query);
      res.send(result);
    });

    // READ: get all successfully enrolled classes
    app.get("/enrolled-class", async (req, res) => {
      const email = req.query.email;
      const query = { studentEmail: email };
      const result = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    // TODO:::
    // Reduced class available seats
    app.patch("/reduce-class-seat/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addClassCollection.findOneAndUpdate(
        { query, availableSeats: { $gt: 0 } },
        { $inc: { availableSeats: -1, enrolledStudents: 1 } },
        { returnOriginal: false } // To get the updated document as a result
      );

      console.log(id, result);
      res.send(result);
    });

    /*------------------------------------
          Instructor Operation Start
    ------------------------------------*/

    // CREATE: add a class by instructor
    app.post("/add-classes", async (req, res) => {
      const newClass = req.body;
      const result = await addClassCollection.insertOne(newClass);
      res.send(result);
    });

    // READ: get all classes created by a spesific istructor
    app.get("/add-classes", async (req, res) => {
      const email = req.query.email;
      const query = { instructorEmail: email };
      const result = await addClassCollection.find(query).toArray();
      res.send(result);
    });

    // UPDATE: modify a instructor class
    app.patch("/update-class/:id", async (req, res) => {
      const id = req.params.id;
      const newClassInfo = req.body;
      const { image, name, price, availableSeats } = newClassInfo;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          image: image,
          name: name,
          price: price,
          availableSeats: availableSeats,
        },
      };
      const result = await addClassCollection.updateOne(query, updateDoc);
      // console.log(result);
      res.send(result);
    });

    /*------------------------------------
          Admin Operation Start
    ------------------------------------*/

    // READ: get all classes created by all istructors
    app.get("/all-added-classes", async (req, res) => {
      const result = await addClassCollection.find().toArray();
      res.send(result);
    });

    // UPDATE: modify class status & send admin feedback
    app.patch("/all-added-classes/:id", async (req, res) => {
      const id = req.params.id;
      const modify = req.body;

      if (modify.status) {
        const query = { _id: new ObjectId(id) };
        // console.log(status, query);
        const updateDoc = {
          $set: {
            status: modify.status,
          },
        };
        const result = await addClassCollection.updateOne(query, updateDoc);
        res.send(result);
      }
      // Send Feedback
      if (modify.feedback) {
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            feedback: modify.feedback,
          },
        };
        const result = await addClassCollection.updateOne(query, updateDoc);
        // console.log("modify ", modify, id, result);
        res.send(result);
      }
    });

    // CREATE: post a user in db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await usersCollection.findOne(query);

      if (!isExist) {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    // READ: get all user from db
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // READ: get a single user from db
    app.get("/current-user", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
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

    /*------------------------------------
              Payment Operations
    ------------------------------------*/

    // PAYMENT METHODE
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // SAVE PAYMENT INFO IN DB
    app.post("/save-payment-info", async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });

    /*-------------------------------------------------
                End point of all operations
    -------------------------------------------------*/

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
