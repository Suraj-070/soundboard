import mongoose from 'mongoose';

const soundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  fileSize: {
    type: Number, // in bytes
    required: true,
  },
  playCount: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    discordId: String,
    username: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
soundSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Generate slug from name
soundSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

const Sound = mongoose.model('Sound', soundSchema);

export default Sound;