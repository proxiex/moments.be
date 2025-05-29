import { Request } from 'express';
import multer from 'multer';

// Configure storage to use memory storage (buffer)
const storage = multer.memoryStorage();

// Configure file filter to accept images and videos
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'));
  }
};

// Configure upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit for videos
  },
  fileFilter,
});

export default upload;