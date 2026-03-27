import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  rating: { type: Number, min: 1, max: 5 },
  text: { type: String, default: '' },
  reply: {
    text: { type: String, default: '' },
    repliedAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'reviews',
});

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
