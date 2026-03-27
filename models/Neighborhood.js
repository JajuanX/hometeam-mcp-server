import mongoose from 'mongoose';

const neighborhoodSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  slug: { type: String, lowercase: true, trim: true },
  county: { type: String, enum: ['Miami-Dade', 'Broward', 'Palm Beach'] },
}, {
  collection: 'neighborhoods',
});

const Neighborhood = mongoose.models.Neighborhood || mongoose.model('Neighborhood', neighborhoodSchema);

export default Neighborhood;
