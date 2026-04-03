import express from 'express';
import multer from 'multer';
import Sound from '../models/Sound.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept MP3 files
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'), false);
    }
  },
});

// Get all sounds
router.get('/', async (req, res) => {
  try {
    const sounds = await Sound.find().sort({ createdAt: -1 });
    res.json(sounds);
  } catch (error) {
    console.error('Error fetching sounds:', error);
    res.status(500).json({ error: 'Failed to fetch sounds' });
  }
});

// Get sound by ID
router.get('/:id', async (req, res) => {
  try {
    const sound = await Sound.findById(req.params.id);
    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }
    res.json(sound);
  } catch (error) {
    console.error('Error fetching sound:', error);
    res.status(500).json({ error: 'Failed to fetch sound' });
  }
});

// Get all unique categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Sound.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Upload new sound
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { name, category, uploadedBy } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Check sound limit (100 max)
    const soundCount = await Sound.countDocuments();
    if (soundCount >= 100) {
      return res.status(400).json({ error: 'Sound limit reached (100 max)' });
    }

    // Generate slug and check for duplicates
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSound = await Sound.findOne({ slug });
    if (existingSound) {
      return res.status(400).json({ error: 'A sound with this name already exists' });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video', // Cloudinary uses 'video' for audio files
          folder: 'soundboard',
          public_id: slug,
          format: 'mp3',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    // Create sound document
    const sound = new Sound({
      name,
      slug,
      category: category.toLowerCase().trim(),
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      duration: uploadResult.duration || 0,
      fileSize: req.file.size,
      uploadedBy: uploadedBy ? JSON.parse(uploadedBy) : undefined,
    });

    await sound.save();

    console.log(`✅ Sound uploaded: ${sound.name} (${sound.category})`);
    res.status(201).json(sound);
  } catch (error) {
    console.error('Error uploading sound:', error);
    res.status(500).json({ error: 'Failed to upload sound' });
  }
});

// Delete sound
router.delete('/:id', async (req, res) => {
  try {
    const sound = await Sound.findById(req.params.id);
    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(sound.cloudinaryPublicId, {
      resource_type: 'video',
    });

    // Delete from database
    await Sound.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Sound deleted: ${sound.name}`);
    res.json({ message: 'Sound deleted successfully' });
  } catch (error) {
    console.error('Error deleting sound:', error);
    res.status(500).json({ error: 'Failed to delete sound' });
  }
});

// Update sound (rename, change category)
router.patch('/:id', async (req, res) => {
  try {
    const { name, category } = req.body;
    const sound = await Sound.findById(req.params.id);

    if (!sound) {
      return res.status(404).json({ error: 'Sound not found' });
    }

    // If name changed, regenerate slug and check duplicates
    if (name && name !== sound.name) {
      const newSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const existingSound = await Sound.findOne({ slug: newSlug, _id: { $ne: sound._id } });
      if (existingSound) {
        return res.status(400).json({ error: 'A sound with this name already exists' });
      }

      sound.name = name;
      sound.slug = newSlug;
    }

    if (category) {
      sound.category = category.toLowerCase().trim();
    }

    await sound.save();

    console.log(`✏️ Sound updated: ${sound.name}`);
    res.json(sound);
  } catch (error) {
    console.error('Error updating sound:', error);
    res.status(500).json({ error: 'Failed to update sound' });
  }
});

export default router;