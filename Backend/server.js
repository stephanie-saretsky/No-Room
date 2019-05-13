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

//Add a cafe (first step)

app.post("/add-cafe", upload.array("files", 3), (req, res) => {
  let sessionId = req.cookies.sid;
  let files = req.files;
  // console.log("body=>", req.body);
  console.log("files" + req.files);

  if (files !== undefined) {
    let arr = files.map(el => {
      let frontendPath = "http://localhost:4000/images/" + el.filename;
      console.log("path for image=>", frontendPath);
      return frontendPath;
    });

    db.collection("sessions")
      .findOne({ sessionId: sessionId })
      .then(owner => {
        let username = owner.username;
        db.collection("users")
          .findOne({ username: username })
          .then(owner => {
            let { name, desc, address } = req.body;
            let images = arr;
            let ownerId = owner._id;
            db.collection("cafes").insertOne(
              {
                name,
                desc,
                address,
                ownerId,
                images
              },
              (err, result) => {
                if (err) throw err;
                console.log("ID OF THE CAFE=>", result.ops[0]._id);
                let cafeId = result.ops[0]._id;
                db.collection("users").updateOne(
                  { username: username },
                  { $addToSet: { cafes: cafeId } }
                );
                res.send(JSON.stringify({ success: true }));
              }
            );
          });
      });
  }
});

// Add a Layout (second step)

app.post("/add-layout", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let chairs = req.body.chairs;
  let tables = req.body.tables;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes")
            .findOne({ ownerId: ownerId })
            .then(cafe => {
              let cafeId = cafe._id;
              db.collection("layouts").insertOne({
                cafeId: cafeId,
                tables: tables,
                chairs: chairs
              });
            });

          res.send(JSON.stringify({ success: true }));
        });
    });
});

// See cafe detail (owner side)

app.post("cafe-owner-details", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let ObjectID = mongo.ObjectID;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
    });
});

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

let a = () => {
  console.log("the server is launched on port: 4000!");
};

app.listen(4000, a(), "0.0.0.0");
