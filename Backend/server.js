let express = require("express");
let multer = require("multer");
let cors = require("cors");
let cookieParser = require("cookie-parser");
let MongoClient = require("mongodb").MongoClient;
let mongo = require("mongodb");
let app = express();
let upload = multer({
  dest: __dirname + "/uploads/"
});

app.use("/images", express.static(__dirname + "/uploads/"));
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());

//Mongo:

let url =
  "mongodb+srv://Lucile:jetaimeal91@cluster1-lqgqn.mongodb.net/test?retryWrites=true";

let db = undefined;

MongoClient.connect(url, { useNewUrlParser: true }, (err, allDbs) => {
  if (err) throw err;
  db = allDbs.db("No-Room");
});

// Generate ID

let generateId = () => {
  return "" + Math.floor(Math.random() * 1000000);
};

//Signup

app.post("/signup", upload.none(), (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  db.collection("users")
    .findOne({ username: username })
    .then(user => {
      if (user !== null) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      db.collection("users").insertOne(
        {
          username: username,
          password: password
        },
        (err, result) => {
          if (err) throw err;
          res.send(JSON.stringify({ success: true }));
        }
      );
    });
});

//Login

app.post("/login", upload.none(), (req, res) => {
  let username = req.body.username;
  console.log("username", username);
  let enteredPassword = req.body.password;
  console.log("password", enteredPassword);
  db.collection("users")
    .findOne({ username: username })
    .then(user => {
      console.log("user", user);
      let expectedPassword = user.password;
      if (enteredPassword !== expectedPassword) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      // code pour if statement
      db.collection("sessions")
        .findOne({ username: username })
        .then(usersession => {
          console.log("USER=>", usersession);
          if (usersession !== null) {
            let NewSessionId = generateId();
            db.collection("sessions").updateOne(
              { username: username },
              { $set: { sessionId: NewSessionId } }
            );
            res.cookie("sid", NewSessionId);
            res.send(JSON.stringify({ success: true }));
            return;
          }
          let sessionId = generateId();
          res.cookie("sid", sessionId);
          db.collection("sessions").insertOne(
            { sessionId: sessionId, username: username },
            (err, result) => {
              if (err) throw err;
              res.send(JSON.stringify({ success: true }));
            }
          );
        });
    });
});

app.get("/logout", (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions").deleteOne({ sessionId: sessionId });

  res.send(JSON.stringify({ success: true }));
});

// List of cafes :

app.get("/cafes", (req, res) => {
  db.collection("cafes")
    .find({})
    .toArray((err, result) => {
      if (err) throw err;
      res.send(JSON.stringify({ success: true, cafeList: result }));
    });
});

//cafe details :

app.post("/cafe-details", upload.none(), (req, res) => {
  let cafeId = req.body.cafeId;
  let ObjectID = mongo.ObjectID;
  db.collection("cafes")
    .findOne({ _id: new ObjectID(cafeId) })
    .then(cafe => {
      db.collection("cafe-reviews")
        .find({ cafeId: cafeId })
        .toArray((err, reviews) => {
          if (err) throw err;
          res.send(
            JSON.stringify({
              success: true,
              cafe: cafe,
              reviews: reviews
            })
          );
        });
    });
});

//Add a cafe:

app.post("/add-cafe", upload.array("file", 3), (req, res) => {
  let sessionId = req.cookies.sid;
  let file = req.file;
  console.log("body=>", req.body);
  console.log(req.file);
  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(owner => {});
});

// let file = req.file;
// if (file !== undefined) {
//   let frontendPath = "http://159.89.112.34:4000/images/" + file.filename;
//   console.log("path for image=>", frontendPath);
//   let newMsg = {
//     username: username,
//     message: msg,
//     img: frontendPath,
//     time: time
//   };

//   messages = messages.concat(newMsg);
//   console.log("new message", newMsg);
//   res.send(JSON.stringify({ success: true }));
//   return;
// }

//delete a cafe:

app.post("/remove-cafe", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let cafeId = req.body.cafeId;
  let ObjectID = mongo.ObjectID;
  console.log(cafeId);
  db.collection("cafes")
    .deleteOne({ _id: new ObjectID(cafeId) })
    .then(result => {
      res.send(JSON.stringify({ success: true }));
    });
});

app.post("/add-cafe");

let a = () => {
  console.log("the server is launched on port: 4000!");
};

app.listen(4000, a(), "0.0.0.0");
