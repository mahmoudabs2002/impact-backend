import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Resolve the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set storage engine with dynamic folder resolution
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check for custom folder based on request field or endpoint
    const folder = req.baseUrl.includes("/articles") 
      ? "uploads/articles" 
      : req.baseUrl.includes("/profiles") 
      ? "uploads/profiles" 
      : "uploads";

    cb(null, path.join(__dirname, folder));
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File type validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
});

export default upload;
