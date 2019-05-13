let express = require("./node_modules/express");
let multer = require("./node_modules/multer");
let cors = require("./node_modules/cors");
let cookieParser = require("./node_modules/cookie-parser");
let MongoClient = require("./node_modules/mongodb").MongoClient;
let mongo = require("./node_modules/mongodb");
let app = express();
let upload = multer({
  dest: __dirname + "/uploads/"
});

app.use("/images", express.static(__dirname + "/uploads/"));
app.use(cors({ credentials: true, origin: "http://159.89.112.34:3000" }));
app.use(cookieParser());

let url =
  "mongodb+srv://noam:alibay@practice-project-mqqcj.mongodb.net/test?retryWrites=true";

let dbs = undefined;
let db = undefined;
MongoClient.connect(url, { useNewUrlParser: true }, (err, allDbs) => {
  if (err) throw err;
  dbs = allDbs;
  db = dbs.db("alibay");
});

let a = () => {
  console.log("the server is launched on port: 4000!");
};

app.listen(4000, a(), "0.0.0.0");
