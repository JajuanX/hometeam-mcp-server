import mongoose from 'mongoose';

const draftClassSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  slug: { type: String, trim: true, lowercase: true },
  month: { type: Number, min: 1, max: 12 },
  year: { type: Number },
  status: { type: String, enum: ['building', 'scheduled', 'published'], default: 'building' },
  publishedAt: { type: Date, default: null },
  scheduledDate: { type: Date, default: null },
  eventDetails: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
  },
  businessCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'draftclasses',
});

const DraftClass = mongoose.models.DraftClass || mongoose.model('DraftClass', draftClassSchema);

export default DraftClass;
