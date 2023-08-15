// setup

// npm init -y
// npm install express

// ENVIRONMENT VARIABLES....
const dotenv = require("dotenv").config();

// EXPRESS LIBRARY...
const express = require("express");
const app = express();

// PORT
const PORT = process.env.PORT || 3005;

// Middleware...
app.use(express.json());


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

const mongodb = require("mongodb");  //mongodb library
const mongoclient = mongodb.MongoClient;  // this instance from mongodb library important for interact with mongodb.
const MONGODB_URL = process.env.MONGODB_URL;  // store sensitive information outside of source code
//This line specifies that the route handler will be triggered when the HTTP method is a GET request and the URL path is the root ("/").
//arrow function that takes two parameters, req (request) and res (response).
app.get("/", (req, res) => {
    res.send("WELCOME TO HALL BOOKINGS");
  });


  
//* 1) CREATING THE ROOMS.
app.post("/Create-Room", async (req, res) => {
    try {
      // Connect MongoDB
      const connection = await mongoclient.connect(MONGODB_URL);
      // -----------------------
      // Select Database
      const db = connection.db("HallBookingnodejs");
      // -----------------------
      //Select Collection
      const collection = db.collection("ROOMS");
      // -----------------------
      // Do Operation
      const Create_Rooms = await collection.insertMany(req.body);
      // -----------------------
      // Finally Close the Connection
      connection.close();
      res.status(200).json({ message: "Successfully Rooms have been Created." });
      // -----------------------
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "!Internal Server Error." });
    }
});




//* 2) BOOKING THE AVAILABLE ROOMS ...
app.post("/Book-Room", async (req, res) => {
    try {
      // Connect MongoDB
      const connection = await mongoclient.connect(MONGODB_URL);
      // -----------------------
      // Select Database
      const db = connection.db("HallBookingnodejs");
      // -----------------------
      // Select Collection
      const Rooms_Collection = db.collection("ROOMS");
      const Booking_Collection = db.collection("BOOKING_DETAILS");
      // -----------------------
      //Do Operations
      //Finding the customer requested room.
      const Get_Rooms = await Rooms_Collection.findOne({ //  get from room collection and with given body id find one means filter one 
        room_id: req.body.room_id,  // want to find a document where the value of the room_id field matches the value of req.body.room_id
      });
      // -----------------------
      // Find the Booking Details ...
      const Get_Booking_Details = await Booking_Collection.find({
        $and: [
          { $and: [{ room_id: req.body.room_id }, { date: req.body.date }] },
        ],
      }).toArray();
      // -----------------------
      //Checking the Booking details in the same date ,
      //the same room is booked or not...
      let Count = [];
      const Checking_Rooms_Available = Get_Booking_Details.map((details) => {
        //  If the starting time of the new customer to book the room
        //  is before the room booked time means room is not available...
        if (details.end_time > req.body.start_time) {
          Count.push(
            `End time of Old customer ${details.end_time} - Start time of new customer ${details.start_time}`
          );
        }
      });
      // -----------------------
      if (Count.length === 0) {
        // Insert new customer ...
        const Post_Booking_Details = await Booking_Collection.insertOne({
          ...req.body,
          booked_status: true,
          room_name: Get_Rooms.room_name,
        });
        // -----------------------
        // Finally Close the Connection
        await connection.close();
        res.status(200).json({ message: "Successfully Your Room Booked" });
        // -----------------------
      } else {
        res.json({ message: "Already Room has been Booked on this time" });
      }
      // -----------------------
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something Went Wrong" });
    }
  });
  
//* 3) GET LIST ALL ROOMS WITH BOOKED_DATA ...
app.get("/Rooms-BookedData", async (req, res) => {
    try {
      //? Connect MongoDB
      const connection = await mongoclient.connect(MONGODB_URL);
      // -----------------------
      //? Select Database
      const db = connection.db("HallBookingnodejs");
      // -----------------------
      //? Select Collection
      const collection = db.collection("BOOKING_DETAILS");
   
      // -----------------------
      //? Do Operation
      const Room_Details = await collection
        .find({}, { projection: { _id: 0 } })  //id field exclude //find{} retrieve all the document in query without any filter so using {} empty
        .toArray(); // convert to array
      // -----------------------
      //? Finally Close the Connection
      connection.close();
      res.status(200).json(Room_Details);
      // -----------------------
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something Went Wrong" });
    }
  });
  
  // -----------------------
  
  //* 4) GET LIST ALL CUSTOMER DETAILS WITH BOOKED DATA...
  app.get("/Customer-BookedData", async (req, res) => {
    try {
      //? Connect MongoDB
      const connection = await mongoclient.connect(MONGODB_URL);
      // -----------------------
      //? Select Database
      const db = connection.db("HallBookingnodejs");
      // -----------------------
      //? Select Collection
      const collection = db.collection("BOOKING_DETAILS");
      // -----------------------
      //? Do Operation
      const Customer_Details = await collection
        .find({}, { projection: { _id: 0, room_id: 0, booked_status: 0} })
        .toArray();
      // -----------------------
      //? Finally Close the Connection
      connection.close();
      res.status(200).json(Customer_Details);
      // -----------------------
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Something Went Wrong" });
    }
  });
  
  // -----------------------
  
  //* 5) GET LIST HOW MANY TIMES CUSTOMERS HAS BOOKED THE ROOM ...
  app.get("/Customer-Details", async (req, res) => {
    try {
      //? Connect MongoDB
      const connection = await mongoclient.connect(MONGODB_URL);
      // -----------------------
      //? Select Database
      const db = connection.db("HallBookingnodejs");
      // -----------------------
      //? Select Collection
      const collection = db.collection("BOOKING_DETAILS");
      // -----------------------
      //? Do Operation
      const Customer_Details = await collection
        .aggregate([
          {
            $group: {
              _id: {
                customer_name: "$customer_name",
                room_id: "$room_id"
              },
              bookings: {
                $push: {
                  date: "$date",
                  start_time: "$start_time",
                  end_time: "$end_time",
                  room_name: "$room_name",
                  booked_status: "$booked_status"
                },
              },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              customer_name: "$_id.customer_name",
              room_id: "$_id.room_id",
              bookings: 1,
              count: 1,
              _id: 0
            },
          }
        ])
        .toArray();
      // -----------------------
      //? Finally Close the Connection
      connection.close();
      res.status(200).json(Customer_Details);
      // -----------------------
    } catch (error) {
      console.log(error);
      res.status(500).json({ messagae: "Something Went Wrong" });
    }
  });

app.listen(PORT, () => console.log("APP LISTENING ON ", PORT));


