import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 30020;

// Serve static assets from build directory
app.use(express.static(path.join(__dirname, "dist")));

// Fallback all unknown URLs to index.html for Single Page Application router to resolve client-side
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running in production on port ${port}`);
});
