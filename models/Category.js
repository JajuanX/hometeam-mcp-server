import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, trim: true },
  slug: { type: String, lowercase: true, trim: true },
  description: { type: String, default: '' },
}, {
  collection: 'categories',
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
