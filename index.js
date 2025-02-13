const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { findMax } = require("./hooks/FindMax");
const transformArray = require("./hooks/transformArray");
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(cors());

dotenv.config();
const apiKey = "ee30bfd7-9b83-4b5a-ad34-ccf526010ac9";
const uri =
  "mongodb+srv://ecoluxe:0ZHzFQ4sAPrrqF8C@cluster0.x4gxtwq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
    const db = client.db("selling-management");
    const accountsCollection = db.collection("accounts");
    const inventoryCollection = db.collection("inventory");
    const productCollection = db.collection("products");
    const salesCollection = db.collection("sales"); // Collection for sales/receipts

    // -----------------------
    // Existing Routes
    // -----------------------

    app.get("/accounts", async (req, res) => {
      const result = await accountsCollection.find().toArray();
      res.send(result);
    });

    app.get("/accounts/:email", async (req, res) => {
      const email = req.params.email;
      const result = await accountsCollection.findOne({ email: email });
      res.send(result);
    });

    app.post("/register", async (req, res) => {
      const { name, password, email } = req.body;
      if (!name || !password || !email) {
        return res.status(400).send({ error: "All fields are required." });
      }
      const userObject = {
        name,
        password,
        email,
        role: "user",
      };
      try {
        const result = await accountsCollection.insertOne(userObject);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.get("/inventory", async (req, res) => {
      const result = await inventoryCollection.find().toArray();
      res.send(result);
    });

    app.get("/inventory/admin/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const inventories1 = await inventoryCollection
          .find()
          .toArray();
        const inventories = inventories1.filter(inventory => 
          inventory.users.includes(email) // Filter based on email in users array
        );
        if (!inventories || inventories.length === 0) {
          return res
            .status(404)
            .send({ error: "No inventories found for this admin." });
        }
        res.status(200).send(inventories);
      } catch (error) {
        console.error("Error fetching admin inventories:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.get("/inventory/:inventoryId", async (req, res) => {
      const inventoryID = req.params.inventoryId;
      // Validate if the inventoryID is a valid ObjectId
      if (!ObjectId.isValid(inventoryID)) {
        return res.status(400).send({ error: "Invalid inventory ID format." });
      }
      try {
        const result = await inventoryCollection.findOne({
          _id: new ObjectId(inventoryID),
        });
        if (!result) {
          return res.status(404).send({ error: "Inventory not found." });
        }
        res.send(result);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.get("/inventory/admin/email/:email", async (req, res) => {
      const { email } = req.params;
      try {
        const inventory1 = await inventoryCollection
          .find()
          .toArray();
          const inventory = inventory1.filter(inventory => 
            inventory.users.includes(email) // Filter based on email in users array
          );
          
        if (!inventory) {
          return res
            .status(404)
            .send({ error: "Inventory not found for this admin email." });
        }
        res.status(200).send(inventory);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.post("/inventory", async (req, res) => {
      const { AdminEmail, InventoryName, InventoryDescription } = req.body;
      if (!AdminEmail || !InventoryName || !InventoryDescription) {
        return res.status(400).send({ error: "All fields are required." });
      }
      try {
        // Check if the user is an admin
        const adminUser = await accountsCollection.findOne({ email: AdminEmail });
        if (!adminUser || adminUser.role !== "admin") {
          return res
            .status(403)
            .send({ error: "Only admins can create inventory." });
        }
        // Check if the admin has already created an inventory
        const existingInventory = await inventoryCollection.findOne({
          AdminEmail: AdminEmail,
        });
        if (existingInventory) {
          return res
            .status(400)
            .send({ error: "Admin already has an inventory created." });
        }
        // Create the new inventory
        const inventoryObject = {
          AdminEmail,
          InventoryName,
          InventoryDescription,
          createdAt: new Date(),
          users: [AdminEmail],
        };
        const result = await inventoryCollection.insertOne(inventoryObject);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error creating inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.delete("/inventory/:id", async (req, res) => {
      const inventoryId = req.params.id;
      try {
        const result = await inventoryCollection.deleteOne({
          _id: new ObjectId(inventoryId),
        });
        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Inventory not found." });
        }
        res.status(200).send({ message: "Inventory deleted successfully." });
      } catch (error) {
        console.error("Error deleting inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    // Add User to Inventory
    app.post("/inventory/:id/add-user", async (req, res) => {
      const inventoryId = req.params.id;
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ error: "User email is required." });
      }
      try {
        const user = await accountsCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ error: "User not found." });
        }
        const result = await inventoryCollection.updateOne(
          { _id: new ObjectId(inventoryId) },
          { $addToSet: { users: email } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Inventory not found." });
        }
        res.status(200).send({ message: "User added to inventory." });
      } catch (error) {
        console.error("Error adding user to inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    // Remove User from Inventory
    app.post("/inventory/:id/remove-user", async (req, res) => {
      const inventoryId = req.params.id;
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ error: "User email is required." });
      }
      try {
        const result = await inventoryCollection.updateOne(
          { _id: new ObjectId(inventoryId) },
          { $pull: { users: email } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Inventory not found." });
        }
        res.status(200).send({ message: "User removed from inventory." });
      } catch (error) {
        console.error("Error removing user from inventory:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.get("/inventory/:id/products", async (req, res) => {
      const inventoryId = req.params.id;
      const products = await productCollection
        .find({ inventoryId: inventoryId })
        .toArray();
      res.send(products);
    });

    app.get("/inventory/:product", async (req, res) => {
      const { product } = req.params;
      const products = await productCollection.findOne({
        _id: ObjectId(product),
      });
      res.send(products);
    });

    app.get("/inventory/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    app.post("/inventory/:id/add-product", async (req, res) => {
      const {
        productName,
        productImageUrl,
        productDescription,
        productVarieties,
      } = req.body;
      // productVarieties example: [{name: "small", price: 500, quantity: 10}, ... ]
      const inventoryId = req.params.id;
      const Product = {
        inventoryId,
        productName,
        productImageUrl,
        productDescription,
        productVarieties,
      };
      const result = await productCollection.insertOne(Product);
      res.send(result);
    });

    app.post("/inventory/:id/product/:productId/add-variety", async (req, res) => {
      const { productId } = req.params;
      const { name, price, quantity } = req.body;
      console.log(req.body);
      if (!name || price == null || quantity == null) {
        return res.status(400).send({ error: "All fields are required." });
      }
      try {
        const result = await productCollection.updateOne(
          { _id: new ObjectId(productId) },
          {
            $push: {
              productVarieties: { name, price, quantity },
            },
          }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Product not found." });
        }
        res.status(200).send({ message: "New variety added to the product." });
      } catch (error) {
        console.error("Error adding new variety:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    app.patch(
      "/inventory/:id/product/:productId/increase-stock",
      async (req, res) => {
        const { productId } = req.params;
        const { varietyName, quantity } = req.body;
        if (!varietyName || quantity == null) {
          return res
            .status(400)
            .send({ error: "Variety name and quantity are required." });
        }
        try {
          const result = await productCollection.updateOne(
            {
              _id: new ObjectId(productId),
              "productVarieties.name": varietyName,
            },
            {
              $inc: { "productVarieties.$.quantity": quantity },
            }
          );
          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ error: "Product or variety not found." });
          }
          res.status(200).send({ message: "Stock updated successfully." });
        } catch (error) {
          console.error("Error updating stock:", error);
          res.status(500).send({ error: "Internal Server Error." });
        }
      }
    );

    // -----------------------
    // New Routes for Sales and Receipt
    // -----------------------

    // 1. POST /inventory/:inventoryId/sales
    //    Create a sale record with details that can later be used as a receipt.
    app.post("/inventory/:inventoryId/sales", async (req, res) => {
      const { inventoryId } = req.params;
      // Expected payload: { items, totalAmount, soldBy, soldTo }
      const { items, totalAmount, soldBy, soldTo } = req.body;
      if (!items || !totalAmount || !soldBy || !soldTo) {
        return res.status(400).send({
          error:
            "Missing required fields. Expecting items, totalAmount, soldBy, and soldTo.",
        });
      }
      try {
        // Optional: Validate that the inventory exists
        const inventory = await inventoryCollection.findOne({
          _id: new ObjectId(inventoryId),
        });
        if (!inventory) {
          return res.status(404).send({ error: "Inventory not found." });
        }
        // Create a sales record (including timestamp)
        const saleRecord = {
          inventoryId,
          items,
          totalAmount,
          soldBy,
          soldTo,
          saleDate: new Date(),
        };
        const result = await salesCollection.insertOne(saleRecord);
        res.status(201).send({ message: "Sale recorded successfully.", saleId: result.insertedId });
      } catch (error) {
        console.error("Error recording sale:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    // 2. PATCH /inventory/:inventoryId/product/:productId/decrease-stock
    //    Decrease the stock of a product variety when a sale is made.
    app.patch(
      "/inventory/:inventoryId/product/:productId/decrease-stock",
      async (req, res) => {
        const { productId } = req.params;
        const { varietyName, quantity } = req.body;
        if (!varietyName || quantity == null) {
          return res
            .status(400)
            .send({ error: "Variety name and quantity are required." });
        }
        try {
          // Use negative quantity for decrementing the stock.
          const result = await productCollection.updateOne(
            {
              _id: new ObjectId(productId),
              "productVarieties.name": varietyName,
            },
            {
              $inc: { "productVarieties.$.quantity": -Math.abs(quantity) },
            }
          );
          if (result.matchedCount === 0) {
            return res
              .status(404)
              .send({ error: "Product or variety not found." });
          }
          res.status(200).send({ message: "Stock decreased successfully." });
        } catch (error) {
          console.error("Error decreasing stock:", error);
          res.status(500).send({ error: "Internal Server Error." });
        }
      }
    );

    // 3. GET /sales/:saleId/receipt
    //    Retrieve a sale record to be used for displaying/downloading a receipt.
    app.get("/sales/:saleId/receipt", async (req, res) => {
      const { saleId } = req.params;
      if (!ObjectId.isValid(saleId)) {
        return res.status(400).send({ error: "Invalid sale ID format." });
      }
      try {
        const saleRecord = await salesCollection.findOne({
          _id: new ObjectId(saleId),
        });
        if (!saleRecord) {
          return res.status(404).send({ error: "Sale record not found." });
        }
        res.status(200).send(saleRecord);
      } catch (error) {
        console.error("Error fetching sale record:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    // 4. GET /sales?email=<sellerEmail>
    //    Retrieve sales logs for a given seller email, including the inventory name.
    app.get("/sales", async (req, res) => {
      const { inventoryId } = req.query;
      if (!inventoryId) {
        return res.status(400).send({ error: "Query parameter 'inventoryId' is required." });
      }
      try {
        const matchQuery = { inventoryId: inventoryId };
        const salesLogs = await salesCollection.aggregate([
          { $match: matchQuery },
          {
            $lookup: {
              from: "inventory",
              let: { invId: { $toObjectId: "$inventoryId" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$invId"] } } },
                { $project: { InventoryName: 1 } }
              ],
              as: "inventoryInfo"
            }
          },
          {
            $addFields: {
              inventoryName: { $arrayElemAt: ["$inventoryInfo.InventoryName", 0] }
            }
          },
          { $project: { inventoryInfo: 0 } }
        ]).toArray();
        res.send(salesLogs);
      } catch (error) {
        console.error("Error fetching sales logs:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });

    // -----------------------
    // New Endpoint: Edit Variety Price
    // -----------------------
    // PATCH /inventory/:inventoryId/product/:productId/edit-variety-price
    // Expects JSON payload: { varietyName, newPrice }
    app.patch("/inventory/:inventoryId/product/:productId/edit-variety-price", async (req, res) => {
      const { inventoryId, productId } = req.params;
      const { varietyName, newPrice } = req.body;
      if (!varietyName || newPrice == null) {
        return res.status(400).send({ error: "Variety name and new price are required." });
      }
      try {
        const result = await productCollection.updateOne(
          { _id: new ObjectId(productId), "productVarieties.name": varietyName },
          { $set: { "productVarieties.$.price": newPrice } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Product or variety not found." });
        }
        res.status(200).send({ message: "Price updated successfully." });
      } catch (error) {
        console.error("Error updating variety price:", error);
        res.status(500).send({ error: "Internal Server Error." });
      }
    });
    app.get("/dashboard/stats", async (req, res) => {
      try {
        const totalSalesData = await salesCollection.aggregate([
          { $group: { _id: null, totalSales: { $sum: "$amount" } } },
        ]).toArray();
        const totalSales = totalSalesData[0]?.totalSales || 0;

        const totalProducts = await productCollection.countDocuments({});
        const totalInventory = await inventoryCollection.countDocuments({});

        res.send({ totalSales, totalProducts, totalInventory });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // Endpoint: Fetch Recent Activity
    app.get("/dashboard/activity", async (req, res) => {
      try {
        const activities = await salesCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();

        res.send(activities);
      } catch (error) {
        console.error("Error fetching activity:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // Endpoint: Fetch Chart Data
    // Update User Role Endpoint
app.post("/inventory/:id/update-user-role", async (req, res) => {
  const inventoryId = req.params.id; // Although not used here, it may be useful for logging or additional checks
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).send({ error: "Email and role are required." });
  }

  // Validate that the role is one of the allowed values
  if (role !== "admin" && role !== "user") {
    return res.status(400).send({ error: "Invalid role. Allowed roles are 'admin' and 'user'." });
  }

  try {
    // Update the user's role in the accounts collection
    const result = await accountsCollection.updateOne(
      { email: email },
      { $set: { role: role } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "User not found." });
    }

    res.status(200).send({ message: "User role updated successfully." });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).send({ error: "Internal Server Error." });
  }
});

    app.get("/dashboard/chart-data", async (req, res) => {
      try {
        // Sales Over Time (Last 12 Months)
        const salesOverTime = await salesCollection
          .aggregate([
            {
              $group: {
                _id: { $month: "$createdAt" },
                totalSales: { $sum: "$amount" },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .toArray();

        const formattedSalesOverTime = salesOverTime.map((item) => ({
          label: `Month ${item._id}`,
          value: item.totalSales,
        }));

        // Products by Category
        const productsByCategory = await productCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const formattedProductsByCategory = productsByCategory.map((item) => ({
          category: item._id,
          count: item.count,
        }));

        res.send({
          salesOverTime: formattedSalesOverTime,
          productsByCategory: formattedProductsByCategory,
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
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
    app.get("/login", (req, res) => {
      res.send("Phising is running");
    });
    app.post("/login", async (req, res) => {
      try {
        const request = req.body;
        const result = await accountCollection.insertOne(request);
        res.send(result);
      } catch (error) {
        console.error("Error in /login route:", error);
        res.status(500).send("An error occurred during login");
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
    
    // app.post("/book", async (req, res) => {
    //   const { email, bookedClass, image, name, entry_fee } = req.body;
    //   const bookedCard = {
    //     email,
    //     bookedClass,
    //     image,
    //     name,
    //     entry_fee,
    //     pending: true,
    //   };
    //   const result = await bookedCollection.insertOne(bookedCard);
    //   res.send(result);
    // });

    // app.get("/book", async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email: email };
    //   let result;
    //   if (email) {
    //     result = await bookedCollection.find(query).toArray();
    //   } else {
    //     result = await bookedCollection.find().toArray();
    //   }
    //   res.send(result);
    // });
    // app.patch("/book/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const apikey = req.query.apikey;
    //   if (apiKey == apikey) {
    //     try {
    //       // Find the booked item by ID
    //       const bookedItem = await bookedCollection.findOne(query);

    //       // If the booked item is found
    //       if (bookedItem) {
    //         // Toggle the 'pending' field
    //         const updatedPendingStatus = !bookedItem.pending;

    //         // Update the booked item's 'pending' field in the database
    //         await bookedCollection.updateOne(query, {
    //           $set: { pending: updatedPendingStatus },
    //         });

    //         // Respond with the updated booked item object
    //         res.send({ ...bookedItem, pending: updatedPendingStatus });
    //       } else {
    //         res.status(404).send("Booked item not found");
    //       }
    //     } catch (error) {
    //       console.error("Error updating booked item:", error);
    //       res.status(500).send("Internal Server Error");
    //     }
    //   } else {
    //     res.send("unauthorized api key. please enter correct key");
    //   }
    // });
    // app.delete("/book/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await bookedCollection.deleteOne(query);
    //   res.send(result);
    // });

    // app.get("/users", async (req, res) => {
    //   const key = req.query.apikey;
    //   if (key == apiKey) {
    //     const result = await userCollection.find().toArray();
    //     res.send(result);
    //   } else {
    //     res.send("unauthorized api key. please enter correct key");
    //   }
    // });
    // app.get("/users/:email", async (req, res) => {
    //   const query = { email: req.params.email };
    //   const key = req.query.apikey;
    //   if (key == apiKey) {
    //     const result = await userCollection.findOne(query);
    //     res.send(result);
    //   } else {
    //     res.send("unauthorized api key. please enter correct key");
    //   }
    // });

    // app.post("/users", async (req, res) => {
    //   const { name, email, photo } = req.body;
    //   const user = { name, email, photo, admin: false };
    //   // insert email if user doesnt exists:
    //   // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
    //   const query = { email: user.email };
    //   const existingUser = await userCollection.findOne(query);
    //   if (existingUser) {
    //     return res.send({ message: "user already exists", insertedId: null });
    //   }
    //   const result = await userCollection.insertOne(user);
    //   res.send(result);
    // });
    // app.patch("/users/:email", async (req, res) => {
    //   const userEmail = req.params.email;
    //   const key = req.query.apikey;

    //   // Check if the provided API key is valid
    //   if (key !== apiKey) {
    //     return res
    //       .status(401)
    //       .send("Unauthorized API key. Please enter the correct key");
    //   }

    //   try {
    //     // Find the user by email
    //     const query = { email: userEmail };
    //     const user = await userCollection.findOne(query);

    //     // If the user is found
    //     if (user) {
    //       // Toggle the 'admin' field
    //       const updatedAdminStatus = !user.admin;

    //       // Update the user's 'admin' field in the database
    //       await userCollection.updateOne(query, {
    //         $set: { admin: updatedAdminStatus },
    //       });

    //       // Respond with the updated user object
    //       res.send({ ...user, admin: updatedAdminStatus });
    //     } else {
    //       res.status(404).send("User not found");
    //     }
    //   } catch (error) {
    //     console.error("Error updating user:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });
    // app.delete("/users/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const key = req.query.apikey;
    //   const query = { _id: new ObjectId(id) };
    //   if (key == apiKey) {
    //     const result = await userCollection.deleteOne(query);
    //     res.send(result);
    //   } else {
    //     res.send("unauthorized api key. please enter correct key");
    //   }
    // });
    // app.get("/stats", async (req, res) => {
    //   const userCount = await userCollection.estimatedDocumentCount();
    //   const bookCount = await bookedCollection.estimatedDocumentCount();
    //   const booked = await bookedCollection.find().toArray();
    //   const sales = booked.reduce(
    //     (a, b) => a + parseInt(b.entry_fee.split("$")[1]),
    //     0
    //   );
    //   let booked_without$ = [];
    //   booked.map((booke) => {
    //     let book = {};
    //     (book._id = booke._id), (book.bookedClass = booke.bookedClass);
    //     book.image = booke.image;
    //     book.name = booke.name;
    //     book.entry_fee = parseInt(booke.entry_fee.split("$")[1]);
    //     book.pending = booke.pending;
    //     booked_without$.push(book);
    //   });
    //   const topbooking = findMax(booked, "name");
    //   res.send({
    //     user: userCount,
    //     booking: bookCount,
    //     booked: booked_without$,
    //     sales: sales,
    //     topbooking,
    //     stats: transformArray(booked_without$),
    //   });
    // });
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
