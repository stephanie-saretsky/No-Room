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
          password: password,
          details: false,
          layout: false
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
  let enteredPassword = req.body.password;
  db.collection("users")
    .findOne({ username: username })
    .then(user => {
      if (user === null) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      let expectedPassword = user.password;
      if (enteredPassword !== expectedPassword) {
        res.send(JSON.stringify({ success: false }));
        return;
      }
      // code pour if statement
      db.collection("sessions")
        .findOne({ username: username })
        .then(usersession => {
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

//Logout

app.get("/logout", (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions").deleteOne({ sessionId: sessionId });

  res.send(JSON.stringify({ success: true }));
});

// Check if user is already login

app.get("/login-check", (req, res) => {
  let sessionId = req.cookies.sid;
  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      if (user !== null) {
        let username = user.username;
        res.send(JSON.stringify({ success: true, username: username }));
        return;
      }
      res.send(JSON.stringify({ success: false }));
      return;
    });
});

// check if user is done edit

app.get("/edit-check", (req, res) => {
  let sessionId = req.cookies.sid;
  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(userInfo => {
          let details = userInfo.details;

          let layout = userInfo.layout;
          let secondEdit = userInfo.secondEdit;
          res.send(
            JSON.stringify({
              success: true,
              details: details,
              layout: layout,
              secondEdit: secondEdit
            })
          );
        });
    });
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
          db.collection("responses-review")
            .find({})
            .toArray((err, responses) => {
              if (err) throw err;
              reviews = reviews.map(review => {
                return {
                  ...review,
                  response: responses.filter(response => {
                    return response.reviewId === review._id.toString();
                  })
                };
              });
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
});

//Add a cafe (first step)

app.post("/add-cafe", upload.array("files", 3), (req, res) => {
  let sessionId = req.cookies.sid;
  let files = req.files;
  let images = [];

  if (files.length !== 0) {
    images = files.map(el => {
      let frontendPath = "http://localhost:4000/images/" + el.filename;
      return frontendPath;
    });
  } else {
    images = images.concat("http://localhost:4000/images/logo.png");
  }

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(owner => {
      let username = owner.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let name = req.body.name;
          let names = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          let number = req.body.number;
          let desc = req.body.desc;
          let address = req.body.address;
          let country = req.body.country;
          let city = req.body.city;
          let code = req.body.code;
          let website = req.body.url;
          let url = "https://" + website;
          let tags = JSON.parse(req.body.tags);
          let ownerId = owner._id.toString();
          db.collection("cafes").insertOne(
            {
              name,
              names,
              desc,
              address,
              code,
              city,
              country,
              number,
              url,
              ownerId,
              images,
              tags,
              waitTime: "0 minutes"
            },
            (err, result) => {
              if (err) throw err;

              let cafeId = result.ops[0]._id.toString();
              db.collection("users").updateOne(
                { username: username },
                { $addToSet: { cafes: cafeId } }
              );
              db.collection("users").updateOne(
                { username: username },
                { $set: { details: true } }
              );
              res.send(
                JSON.stringify({
                  success: true,
                  cafeId: cafeId,
                  address: address,
                  city: city
                })
              );
            }
          );
        });
    });
});

//Add a location:

app.post("/add-location", upload.none(), (req, res) => {
  let cafeId = req.body.cafeId;
  let location = JSON.parse(req.body.location);
  let ObjectID = mongo.ObjectID;

  db.collection("cafes").updateOne(
    { _id: new ObjectID(cafeId) },
    {
      $set: {
        location: location
      }
    }
  );
  res.send(JSON.stringify({ success: true }));
});

// Add a Layout (second step)

app.post("/add-layout", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let chairs = JSON.parse(req.body.chairs);
  let tables = JSON.parse(req.body.tables);

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes").updateOne(
            { ownerId: ownerId.toString() },
            {
              $set: {
                tables: tables,
                chairs: chairs
              }
            }
          );
          db.collection("users").updateOne(
            { username: username },
            { $set: { layout: true } }
          );
        });
    });

  res.send(JSON.stringify({ success: true }));
});

// See cafe detail (owner side)

app.post("/cafe-owner-details", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes")
            .find({ ownerId: ownerId.toString() })
            .toArray((err, resultCafes) => {
              if (err) throw err;
<<<<<<< HEAD

=======
>>>>>>> ed546584ed7f7f5dc51c38c61e54f417ef6f7524
              res.send(JSON.stringify(resultCafes));
            });
        });
    });
});

//change seat

app.post("/change-seat", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let chairId = req.body.chairId;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes")
            .findOne({ ownerId: ownerId.toString() })
            .then(cafe => {
              let chairs = cafe.chairs;
              chairs = chairs.map(chair => {
                if (chair.id !== chairId) return chair;
                if (chair.id === chairId) {
                  if (chair.taken === true) {
                    return { ...chair, taken: false };
                  }
                  if (chair.taken === false) {
                    return { ...chair, taken: true };
                  }
                }
              });
              db.collection("cafes").updateOne(
                { ownerId: ownerId.toString() },
                {
                  $set: {
                    chairs: chairs
                  }
                }
              );
              res.send(JSON.stringify({ success: true }));
            });
        });
    });
});

//set a wait time

app.post("/wait-time", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let waitTime = req.body.waitTime;
  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes").updateOne(
            { ownerId: ownerId.toString() },
            { $set: { waitTime: waitTime } }
          );
          res.send(JSON.stringify({ success: true }));
        });
    });
});

//delete a cafe

app.post("/remove-cafe", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;

  if (cafeId === undefined) {
    res.send(JSON.stringify({ success: false }));
  }

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("user")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes").deleteOne({ ownerId: ownerId.toString() });
        })
        .then(result => {
          res.send(JSON.stringify({ success: true }));
        });
    });
});

//edit layout

app.get("/edit-layout", (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users").updateOne(
        { username: username },
        { $set: { layout: false } }
      );
<<<<<<< HEAD
      res.send(JSON.stringify({ success: true }));
=======
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes")
            .findOne({ ownerId: ownerId.toString() })
            .then(cafe => {
              let cafeChairs = cafe.chairs;
              let cafeTables = cafe.tables;

              res.send(
                JSON.stringify({
                  success: true,
                  chairs: cafeChairs,
                  tables: cafeTables
                })
              );
            });
        });
>>>>>>> ed546584ed7f7f5dc51c38c61e54f417ef6f7524
    });
});

//edit details (owner side)

app.get("/edit-details", (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users").updateOne(
        { username: username },
        { $set: { details: false, layout: false, secondEdit: true } }
      );
      res.send(JSON.stringify({ success: true }));
    });
});

app.get("/cafe-info", (req, res) => {
  let sessionId = req.cookies.sid;

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(user => {
      let username = user.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let ownerId = owner._id;
          db.collection("cafes")
            .findOne({ ownerId: ownerId.toString() })
            .then(cafe => {
              let cafeChairs = cafe.chairs;
              let cafeTables = cafe.tables;

              res.send(
                JSON.stringify({
                  success: true,
                  chairs: cafeChairs,
                  tables: cafeTables,
                  cafe: cafe
                })
              );
            });
        });
    });
});

app.post("/edit-cafe", upload.array("files", 3), (req, res) => {
  let sessionId = req.cookies.sid;
  let files = req.files;
  let images = JSON.parse(req.body.images);
  console.log("images", images);

  if (files.length !== 0) {
    console.log("not zero");
    files.map(el => {
      let frontendPath = "http://localhost:4000/images/" + el.filename;
      images = images.concat(frontendPath);
    });
  }

  db.collection("sessions")
    .findOne({ sessionId: sessionId })
    .then(owner => {
      let username = owner.username;
      db.collection("users")
        .findOne({ username: username })
        .then(owner => {
          let name = req.body.name;
          let number = req.body.number;
          let desc = req.body.desc;
          let address = req.body.address;
          let country = req.body.country;
          let city = req.body.city;
          let code = req.body.code;
          let url = req.body.url;
          let tags = JSON.parse(req.body.tags);
          let ownerId = owner._id.toString();
          db.collection("cafes").updateOne(
            { ownerId: ownerId },
            {
              $set: {
                name,
                desc,
                address,
                code,
                city,
                country,
                number,
                url,
                ownerId,
                images,
                tags
              }
            }
          );
          db.collection("users").updateOne(
            { username: username },
            { $set: { details: true, layout: true, secondEdit: false } }
          );
          db.collection("cafes")
            .findOne({ ownerId: ownerId })
            .then(cafe => {
              let cafeId = cafe._id.toString();
              res.send(
                JSON.stringify({
                  success: true,
                  cafeId: cafeId,
                  address: address,
                  city: city
                })
              );
            });
        });
    });
});

app.post("/reviews", upload.none(), (req, res) => {
  let cafeId = req.body.cafeId;

  let ObjectID = mongo.ObjectID;
  db.collection("cafes")
    .findOne({ _id: new ObjectID(cafeId) })
    .then(cafe => {
      db.collection("cafe-reviews")
        .find({ cafeId: cafeId })
        .toArray((err, reviews) => {
          if (err) throw err;
          db.collection("responses-review")
            .find({})
            .toArray((err, responses) => {
              if (err) throw err;
              reviews = reviews.map(review => {
                return {
                  ...review,
                  response: responses.filter(response => {
                    return response.reviewId === review._id.toString();
                  })
                };
              });

              res.send(
                JSON.stringify({
                  success: true,
                  reviews: reviews
                })
              );
            });
        });
    });
});

//add a review to a cafe

app.post("/add-review", upload.none(), (req, res) => {
  let cafeId = req.body.cafeId;
  let review = req.body.review;
  let rating = req.body.rating;
  let reviewerName = req.body.name;
  let ObjectID = mongo.ObjectID;

  db.collection("cafes")
    .findOne({ _id: new ObjectID(cafeId) })
    .then(cafe => {
      name = cafe.name;
      db.collection("cafe-reviews").insertOne(
        {
          name,
          cafeId,
          review,
          rating,
          reviewerName
        },
        (err, result) => {
          if (err) throw err;
          res.send(JSON.stringify({ success: true }));
          return;
        }
      );
    });
});

// response to a review

app.post("/response-review", upload.none(), (req, res) => {
  let sessionId = req.cookies.sid;
  let response = req.body.response;
  let reviewId = req.body.reviewId;

  db.collection("session")
    .findOne({ sessionId: sessionId })
    .then(owner => {
      let username = owner.username;
      db.collection("responses-review").insertOne({
        reviewId: reviewId,
        response: response,
        ownerName: username
      });
      res.send(JSON.stringify({ success: true }));
      return;
    });
});

//add response

app.post("/add-response", upload.none(), (req, res) => {
  let reviewId = req.body.reviewId;
  let response = req.body.response;
  let ownerName = req.body.ownerName;
  let edit = req.body.edit;

  db.collection("responses-review").insertOne(
    {
      reviewId,
      response,
      ownerName,
      edit
    },
    (err, result) => {
      if (err) throw result;
      res.send(JSON.stringify({ success: true }));
      return;
    }
  );
});

//get response from a review

app.post("/get-response", upload.none(), (req, res) => {
  let reviewId = req.body.reviewId;

  db.collection("responses-review").findOne(
    { reviewId: reviewId },
    (err, result) => {
      if (err) throw err;
      res.send(JSON.stringify({ result: result, success: true }));
      return;
    }
  );
});

//edt response:

app.post("/edit-response", upload.none(), (req, res) => {
  let reviewId = req.body.reviewId;
  let response = req.body.response;

  db.collection("responses-review").updateOne(
    { reviewId: reviewId },
    {
      $set: {
        response: response
      }
    }
  );
  res.send(JSON.stringify({ success: true }));
  return;
});

//search cafe

app.get("/search-cafe", (req, res) => {
  let search = req.query.search;
  let regexSearch = new RegExp(search, "i");

  db.collection("cafes")
    .find({
      $or: [
        { desc: { $regex: regexSearch } },
        { name: { $regex: regexSearch } },
        { names: { $regex: regexSearch } },
        { tags: { $in: [regexSearch] } },
        { address: { $regex: regexSearch } },
        { city: { $regex: regexSearch } }
      ]
    })
    .toArray((err, result) => {
      if (err) throw err;
      res.send(JSON.stringify({ success: true, cafes: result }));
    });
});

app.get("/autocomplete", upload.none(), (req, res) => {
  let ObjectID = mongo.ObjectID;
  let id = "5cdc72f51c9d44000083a958";
  db.collection("autocomplete").findOne(
    { _id: new ObjectID(id) },
    (err, results) => {
      if (err) throw err;
      res.send(JSON.stringify(results));
    }
  );
});

app.post("/checkAuto", upload.none(), (req, res) => {
  let elements = JSON.parse(req.body.elements);
  let id = "5cdc72f51c9d44000083a958";
  let ObjectID = mongo.ObjectID;

  db.collection("autocomplete").updateOne(
    { _id: new ObjectID(id) },
    {
      $set: {
        elements: elements
      }
    }
  );
  res.send(JSON.stringify({ success: true }));
  return;
});

app.post("/search-address", upload.none(), (req, res) => {});

// new endpoint => fonction

let a = () => {
  console.log("the server is launched on port: 4000!");
};

app.listen(4000, a(), "0.0.0.0");
