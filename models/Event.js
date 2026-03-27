import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  type: { type: String, enum: ['event', 'special'] },
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'events',
});

const Event = mongoose.models.Event || mongoose.model('Event', eventSchema);

export default Event;
