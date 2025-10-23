import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection (optional for local testing)
// If you want DB features, set MONGODB_URI. Otherwise server will run without DB.
if (process.env.MONGODB_URI && process.env.MONGODB_URI.length > 0) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));
} else {
  console.warn('⚠️ No MONGODB_URI set — skipping database connection. Set MONGODB_URI to enable DB features.');
}

// MongoDB Schemas and Models
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  compressionStats: {
    totalCompressions: { type: Number, default: 0 },
    totalSizeSaved: { type: Number, default: 0 }, // Fixed: Added default value
    lastCompression: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const compressionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFilename: String,
  compressedFilename: String,
  originalSize: Number,
  compressedSize: Number,
  compressionRatio: Number,
  format: String,
  quality: Number,
  dimensions: {
    original: { width: Number, height: Number },
    compressed: { width: Number, height: Number }
  },
  downloadUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
const CompressionHistory = mongoose.model('CompressionHistory', compressionHistorySchema);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Rate Limiting
const compressionLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many compression requests from this IP, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.'
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large', 
        message: 'File size must be less than 10MB' 
      });
    }
  }
  res.status(500).json({ 
    error: 'Upload failed', 
    message: error.message 
  });
});

// Utility function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Auth Routes
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        compressionStats: user.compressionStats
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        compressionStats: user.compressionStats,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile', message: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', message: error.message });
  }
});

// Compression Routes
app.post('/api/compress', optionalAuth, compressionLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { 
      quality = 80, 
      format = 'jpeg', 
      width, 
      height,
      maintainAspectRatio = 'true'
    } = req.body;

    const qualityValue = Math.min(100, Math.max(10, parseInt(quality) || 80));
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
    const outputFormat = validFormats.includes(format.toLowerCase()) ? format.toLowerCase() : 'jpeg';

    const fileName = `${uuidv4()}.${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
    const outputPath = path.join(uploadsDir, fileName);

    let sharpInstance = sharp(req.file.buffer);
    const metadata = await sharpInstance.metadata();
    
    let compressedDimensions = { width: metadata.width, height: metadata.height };
    if (width || height) {
      const resizeOptions = {
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        withoutEnlargement: true,
        fit: maintainAspectRatio === 'true' ? 'inside' : 'fill'
      };
      
      sharpInstance = sharpInstance.resize(resizeOptions);
      const newMetadata = await sharpInstance.metadata();
      compressedDimensions = { width: newMetadata.width, height: newMetadata.height };
    }

    let compressedBuffer;
    switch (outputFormat) {
      case 'jpeg':
      case 'jpg':
        compressedBuffer = await sharpInstance
          .jpeg({ 
            quality: qualityValue,
            mozjpeg: true
          })
          .toBuffer();
        break;
      case 'png':
        const pngQuality = Math.floor(9 - (qualityValue / 11.11));
        compressedBuffer = await sharpInstance
          .png({ 
            compressionLevel: Math.max(0, Math.min(9, pngQuality))
          })
          .toBuffer();
        break;
      case 'webp':
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: qualityValue
          })
          .toBuffer();
        break;
      case 'avif':
        compressedBuffer = await sharpInstance
          .avif({ 
            quality: qualityValue
          })
          .toBuffer();
        break;
      default:
        compressedBuffer = await sharpInstance
          .jpeg({ quality: qualityValue })
          .toBuffer();
    }

    const originalSize = req.file.size;
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
    const savings = originalSize - compressedSize;

    await sharp(compressedBuffer).toFile(outputPath);

    let compressionRecord = null;
    if (req.user) {
      compressionRecord = new CompressionHistory({
        userId: req.user.userId,
        originalFilename: req.file.originalname,
        compressedFilename: fileName,
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio),
        format: outputFormat,
        quality: qualityValue,
        dimensions: {
          original: { width: metadata.width, height: metadata.height },
          compressed: compressedDimensions
        },
        downloadUrl: `/uploads/${fileName}`
      });

      await compressionRecord.save();

      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { 
          'compressionStats.totalCompressions': 1,
          'compressionStats.totalSizeSaved': savings
        },
        $set: { 'compressionStats.lastCompression': new Date() }
      });
    }

    res.json({
      success: true,
      fileName: fileName,
      originalSize,
      compressedSize,
      compressionRatio,
      savings: formatFileSize(savings),
      downloadUrl: `/uploads/${fileName}`,
      format: outputFormat,
      dimensions: {
        original: {
          width: metadata.width,
          height: metadata.height
        },
        compressed: compressedDimensions
      },
      recordId: compressionRecord?._id
    });

  } catch (error) {
    console.error('Compression error:', error);
    res.status(500).json({ 
      error: 'Compression failed', 
      message: error.message 
    });
  }
});

// Updated Get compression history with dynamic sorting
app.get('/api/compression/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt'; // Default sort by createdAt
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default to descending

    // Validate sortBy field
    const validSortFields = ['createdAt', 'originalSize', 'compressedSize', 'compressionRatio'];
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy field' });
    }

    // Validate page and limit
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive integers' });
    }

    const skip = (page - 1) * limit;

    const sortQuery = { [sortBy]: sortOrder };

    const history = await CompressionHistory.find({ userId: req.user.userId })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .select('-userId');

    const total = await CompressionHistory.countDocuments({ userId: req.user.userId });

    res.json({
      success: true,
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc'
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get compression history', message: error.message });
  }
});

app.get('/api/compression/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('compressionStats');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await CompressionHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
      {
        $group: {
          _id: null,
          totalCompressions: { $sum: 1 },
          totalOriginalSize: { $sum: '$originalSize' },
          totalCompressedSize: { $sum: '$compressedSize' },
          avgCompressionRatio: { $avg: '$compressionRatio' },
          mostUsedFormat: { $addToSet: '$format' }
        }
      }
    ]);

    const compressionStats = stats[0] || {
      totalCompressions: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      avgCompressionRatio: 0
    };

    res.json({
      success: true,
      stats: {
        ...compressionStats,
        totalSizeSaved: compressionStats.totalOriginalSize - compressionStats.totalCompressedSize,
        userStats: user.compressionStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get compression statistics', message: error.message });
  }
});

app.delete('/api/compression/history/:recordId', authenticateToken, async (req, res) => {
  try {
    const record = await CompressionHistory.findOne({
      _id: req.params.recordId,
      userId: req.user.userId
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const filePath = path.join(uploadsDir, record.compressedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await CompressionHistory.findByIdAndDelete(req.params.recordId);

    res.json({
      success: true,
      message: 'Compression record deleted successfully'
    });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ error: 'Failed to delete record', message: error.message });
  }
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const totalCompressions = await CompressionHistory.countDocuments();
    
    const storageStats = await CompressionHistory.aggregate([
      {
        $group: {
          _id: null,
          totalStorageUsed: { $sum: '$compressedSize' },
          totalSpaceSaved: { 
            $sum: { $subtract: ['$originalSize', '$compressedSize'] } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCompressions,
        storage: storageStats[0] || { totalStorageUsed: 0, totalSpaceSaved: 0 }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to get admin statistics', message: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Image Compressor API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

app.get('/api/info', (req, res) => {
  res.json({
    name: 'Image Compressor API',
    version: '2.0.0',
    features: [
      'JWT Authentication',
      'User Registration & Login',
      'Compression History',
      'User Statistics',
      'Multiple Format Support',
      'Rate Limiting'
    ],
    maxFileSize: '10MB',
    supportedFormats: ['JPEG', 'PNG', 'WebP', 'AVIF']
  });
});

app.delete('/api/cleanup/:filename', authenticateToken, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    await CompressionHistory.findOneAndDelete({ 
      compressedFilename: filename,
      userId: req.user.userId
    });
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Cleanup failed', message: error.message });
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Try multiple candidate locations for the built frontend. Different hosts
// sometimes use different working directories; check a few common locations
// and pick the first existing one.
const candidateBuildPaths = [
  path.join(__dirname, '..', 'frontend', 'dist'),        // backend/../frontend/dist
  path.join(process.cwd(), 'frontend', 'dist'),          // current-working-dir/frontend/dist
  path.join(__dirname, '..', 'dist'),                    // backend/../dist
  path.join(process.cwd(), 'dist')                       // current-working-dir/dist
];

let clientBuildPath = candidateBuildPaths.find(p => fs.existsSync(p));

if (!clientBuildPath) {
  // If not found, optionally try an automatic build (only when not skipped)
  if (!process.env.SKIP_FRONTEND_BUILD) {
    try {
      console.log('\u{1F528} No frontend build found in candidate paths. Attempting to build frontend...');
      execSync('npm --prefix "' + path.join(process.cwd(), 'frontend') + '" install --no-audit --no-fund', { stdio: 'inherit' });
      execSync('npm --prefix "' + path.join(process.cwd(), 'frontend') + '" run build', { stdio: 'inherit' });
      // After building, re-evaluate candidates
      clientBuildPath = candidateBuildPaths.find(p => fs.existsSync(p));
      if (clientBuildPath) {
        console.log('\u2705 Frontend built and found at:', clientBuildPath);
      }
    } catch (err) {
      console.error('\u274C Automatic frontend build failed:', err && err.message ? err.message : err);
    }
  } else {
    console.log('SKIP_FRONTEND_BUILD is set; skipping automatic frontend build.');
  }
}

if (clientBuildPath) {
  console.log(`\u{1F4C4} Serving frontend from: ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));

  // Root route: serve index.html for '/', and also add a general SPA fallback
  app.get('/', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.warn('\u26A0\uFE0F No frontend build found in any candidate path. Please ensure the frontend build ran during the build step or set SKIP_FRONTEND_BUILD=1 to skip automatic build attempts.');
}

app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`🔐 JWT Authentication: Enabled`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});
// Global handlers to prevent the process from exiting silently and to provide clearer logs
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});