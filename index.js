const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(cors());

dotenv.config();
const apiKey = "ee30bfd7-9b83-4b5a-ad34-ccf526010ac9";
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.bx1z9cc.mongodb.net/?retryWrites=true&w=majority`;

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
    const classCollection = client.db("Mystitsu").collection("class");
    const bookedCollection = client.db("Mystitsu").collection("booked");
    const userCollection = client.db("Mystitsu").collection("users");
    const instructorsCollection = client
      .db("Mystitsu")
      .collection("instructors");
    // Send a ping to confirm a successful connection

    app.get("/classes", async (req, res) => {
      const query = req.query.quantity;
      const data = await classCollection.find().toArray();
      if (query) {
        const result = data.slice(0, query);
        res.send(result);
      }
      if (!query) {
        res.send(data);
      }
    });
    app.post("/classes", async (req, res) => {
      const body = req.body;
      console.log(body);
      const result = await classCollection.insertOne(body);
      res.send(result);
    });
    app.get("/classes/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const data = await classCollection.findOne(query);
      res.send(data);
    });
    app.delete("/classes/:id", async (req, res) => {
      const apikey = req.query.apikey;
      const query = { _id: new ObjectId(req.params.id) };
      if (apiKey == apikey) {
        const data = await classCollection.deleteOne(query);
        res.send(data);
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });
    app.get("/instructors", async (req, res) => {
      const quantity = req.query.quantity;
      const data = await instructorsCollection.find().toArray();
      if (quantity) {
        const result = data.slice(0, quantity);
        res.send(result);
      }
      if (!quantity) {
        res.send(data);
      }
    });
    app.post("/instructors", async (req, res) => {
      const body = req.body;
      const result = instructorsCollection.insertOne(body);
      res.send(result);
    });
    app.get("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await instructorsCollection.findOne(query);
      res.send(result);
    });
    app.delete("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const apikey = req.query.apikey;
      const query = { _id: new ObjectId(id) };
      if (apiKey == apikey) {
        const result = await instructorsCollection.deleteOne(query);
        res.send(result);
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });
    app.post("/book", async (req, res) => {
      const { email, bookedClass, image, name, entry_fee } = req.body;
      const bookedCard = {
        email,
        bookedClass,
        image,
        name,
        entry_fee,
        pending: true,
      };
      const result = await bookedCollection.insertOne(bookedCard);
      res.send(result);
    });

    app.get("/book", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      let result;
      if (email) {
        result = await bookedCollection.find(query).toArray();
      } else {
        result = await bookedCollection.find().toArray();
      }
      res.send(result);
    });
    app.patch("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const apikey = req.query.apikey;
      if (apiKey == apikey) {
        try {
          // Find the booked item by ID
          const bookedItem = await bookedCollection.findOne(query);

          // If the booked item is found
          if (bookedItem) {
            // Toggle the 'pending' field
            const updatedPendingStatus = !bookedItem.pending;

            // Update the booked item's 'pending' field in the database
            await bookedCollection.updateOne(query, {
              $set: { pending: updatedPendingStatus },
            });

            // Respond with the updated booked item object
            res.send({ ...bookedItem, pending: updatedPendingStatus });
          } else {
            res.status(404).send("Booked item not found");
          }
        } catch (error) {
          console.error("Error updating booked item:", error);
          res.status(500).send("Internal Server Error");
        }
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });
    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookedCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const key = req.query.apikey;
      if (key == apiKey) {
        const result = await userCollection.find().toArray();
        res.send(result);
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });
    app.get("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      const key = req.query.apikey;
      if (key == apiKey) {
        const result = await userCollection.findOne(query);
        res.send(result);
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });

    app.post("/users", async (req, res) => {
      const { name, email, photo } = req.body;
      const user = { name, email, photo, admin: false };
      // insert email if user doesnt exists:
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/:email", async (req, res) => {
      const userEmail = req.params.email;
      const key = req.query.apikey;

      // Check if the provided API key is valid
      if (key !== apiKey) {
        return res
          .status(401)
          .send("Unauthorized API key. Please enter the correct key");
      }

      try {
        // Find the user by email
        const query = { email: userEmail };
        const user = await userCollection.findOne(query);

        // If the user is found
        if (user) {
          // Toggle the 'admin' field
          const updatedAdminStatus = !user.admin;

          // Update the user's 'admin' field in the database
          await userCollection.updateOne(query, {
            $set: { admin: updatedAdminStatus },
          });

          // Respond with the updated user object
          res.send({ ...user, admin: updatedAdminStatus });
        } else {
          res.status(404).send("User not found");
        }
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const key = req.query.apikey;
      const query = { _id: new ObjectId(id) };
      if (key == apiKey) {
        const result = await userCollection.deleteOne(query);
        res.send(result);
      } else {
        res.send("unauthorized api key. please enter correct key");
      }
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Mistitsu Art: Running Mistitsu");
});

app.listen(port, () => {
  console.log("Mistitsu Art: Running Mistitsu");
});
