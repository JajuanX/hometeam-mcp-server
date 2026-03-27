import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  slug: { type: String, trim: true, lowercase: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  neighborhood: { type: mongoose.Schema.Types.ObjectId, ref: 'Neighborhood' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
  },
  socialMedia: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  hours: [{
    day: { type: String },
    open: { type: String, default: '' },
    close: { type: String, default: '' },
    closed: { type: Boolean, default: false },
  }],
  photos: { type: [String], default: [] },
  logo: { type: String, default: '' },
  status: { type: String, default: 'applied' },
  draftClass: { type: mongoose.Schema.Types.ObjectId, ref: 'DraftClass', default: null },
  stats: {
    totalVisits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    totalFavorites: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
  },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'businesses',
});

const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);

export default Business;
