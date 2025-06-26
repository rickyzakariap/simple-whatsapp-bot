const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Image processing effects
const effects = {
  grayscale: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .grayscale()
      .toFile(outputPath);
  },
  
  blur: async (inputPath, outputPath, intensity = 5) => {
    await sharp(inputPath)
      .blur(parseFloat(intensity) || 5)
      .toFile(outputPath);
  },
  
  sharpen: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .sharpen()
      .toFile(outputPath);
  },
  
  sepia: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .tint({ r: 112, g: 66, b: 20 })
      .toFile(outputPath);
  },
  
  invert: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .negate()
      .toFile(outputPath);
  },
  
  brightness: async (inputPath, outputPath, value = 1.2) => {
    await sharp(inputPath)
      .modulate({ brightness: parseFloat(value) || 1.2 })
      .toFile(outputPath);
  },
  
  contrast: async (inputPath, outputPath, value = 1.5) => {
    await sharp(inputPath)
      .modulate({ contrast: parseFloat(value) || 1.5 })
      .toFile(outputPath);
  },
  
  saturation: async (inputPath, outputPath, value = 1.5) => {
    await sharp(inputPath)
      .modulate({ saturation: parseFloat(value) || 1.5 })
      .toFile(outputPath);
  },
  
  resize: async (inputPath, outputPath, width = 800, height = 600) => {
    await sharp(inputPath)
      .resize(parseInt(width) || 800, parseInt(height) || 600, { fit: 'inside', withoutEnlargement: true })
      .toFile(outputPath);
  },
  
  rotate: async (inputPath, outputPath, angle = 90) => {
    await sharp(inputPath)
      .rotate(parseFloat(angle) || 90)
      .toFile(outputPath);
  },
  
  flip: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .flip()
      .toFile(outputPath);
  },
  
  flop: async (inputPath, outputPath) => {
    await sharp(inputPath)
      .flop()
      .toFile(outputPath);
  },
  
  darken: async (inputPath, outputPath, intensity = 0.6) => {
    // Convert intensity to number and ensure it's between 0.1 and 1
    const darkenValue = Math.max(0.1, Math.min(1, parseFloat(intensity) || 0.6));
    
    // Actually darken the image by reducing brightness
    await sharp(inputPath)
      .modulate({ brightness: darkenValue })
      .toFile(outputPath);
  },
  
  'darken-skin': async (inputPath, outputPath, intensity = 0.7) => {
    // Convert intensity to number and ensure it's between 0.1 and 1
    const darkenValue = Math.max(0.1, Math.min(1, parseFloat(intensity) || 0.7));
    
    // Create a more sophisticated skin darkening effect
    // First, create a skin tone mask using color detection
    const skinToneFilter = `
      <svg>
        <defs>
          <filter id="skinDarken">
            <feColorMatrix type="matrix" values="
              0.299 0.587 0.114 0 0
              0.299 0.587 0.114 0 0
              0.299 0.587 0.114 0 0
              0 0 0 1 0
            "/>
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0 0.2 0.4 0.6 0.8 1"/>
              <feFuncG type="table" tableValues="0 0.15 0.3 0.45 0.6 1"/>
              <feFuncB type="table" tableValues="0 0.1 0.2 0.3 0.4 1"/>
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#skinDarken)" opacity="${1 - darkenValue}"/>
      </svg>
    `;
    
    await sharp(inputPath)
      .composite([{
        input: Buffer.from(skinToneFilter),
        blend: 'multiply'
      }])
      .modulate({ brightness: darkenValue * 0.9, saturation: 0.95 })
      .toFile(outputPath);
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload and process image
app.post('/process-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { effect, intensity } = req.body;
    const inputPath = req.file.path;
    const outputPath = path.join(uploadsDir, `processed-${Date.now()}.jpg`);

    if (effects[effect]) {
      await effects[effect](inputPath, outputPath, intensity);
      
      // Read the processed image and send as base64
      const processedImage = fs.readFileSync(outputPath);
      const base64Image = processedImage.toString('base64');
      
      // Clean up files
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      
      res.json({ 
        success: true, 
        image: `data:image/jpeg;base64,${base64Image}`,
        effect: effect 
      });
    } else {
      res.status(400).json({ error: 'Invalid effect specified' });
    }
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Get available effects
app.get('/effects', (req, res) => {
  res.json({ effects: Object.keys(effects) });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🖼️ Image Changer Web Server running on http://localhost:${PORT}`);
});

module.exports = { app, effects }; 