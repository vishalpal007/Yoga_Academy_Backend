const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
require("dotenv").config();
require("./utils/scheduler")

const app = express();


app.use(helmet());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use(hpp());
app.use(compression());


app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("✅ MongoDB connected successfully");
    }).catch((err) => {
        console.error("❌ MongoDB connection failed:", err.message);
        process.exit(1);
    });

// Admin Routes
app.use("/api/v1/admin/enroll", require("./routes/Admin/enroll.routes"));
app.use("/api/v1/admin/auth", require("./routes/Admin/adminAuth.routes"));
app.use("/api/v1/admin/course", require("./routes/Admin/course.routes"));
app.use("/api/v1/admin/live-session", require("./routes/Admin/liveSession.routes"));
// User Routes
app.use("/api/v1/user/auth", require("./routes/User/userAuth.routes"));
app.use("/api/v1/course", require("./routes/User/course.routes"));
app.use("/api/v1/user/enroll", require("./routes/User/enrollment.routes"));


app.all('/*splat', (req, res) => {
    res.status(404).json({ message: "Resource Not Found" });
});


app.use((err, req, res, next) => {
    console.error("❗ Error:", err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
