import express from "express";
import cors from "cors";
// import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./configF/db";
import { admin, user,company, level, bestfor, collection, audio } from "./routes";
import { checkValidAdminRole } from "./utils";
import bodyParser from "body-parser";
import { login, newPassswordAfterOTPVerified } from "./controllers/admin/admin";
import { forgotPassword } from "./controllers/admin/admin";



// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url); // <-- Define __filename
const __dirname = path.dirname(__filename); // <-- Define __dirname

const PORT = process.env.PORT || 8000;
const app = express();
app.set("trust proxy", true);
app.use(
  bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
// app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  })
);

var dir = path.join(__dirname, "static");
app.use(express.static(dir));

var uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

connectDB();

app.get("/", (_, res: any) => {
  res.send("Hello world entry point 🚀✅");
});

app.use("/api/admin", checkValidAdminRole, admin);
app.use("/api/user", user);
app.use("/api/company",company)
app.post("/api/login", login);
app.use("/api/collection", collection);
app.use('/api/level', level);
app.use('/api/bestfor', bestfor);
app.use("/api/audio", audio);

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));