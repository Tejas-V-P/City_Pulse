import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['Format/Access', 'Cost', 'Audience', 'Theme'],
      index: true
    },
    keywords: [{ type: String }]
  },
  { timestamps: true }
);

export const Tag = mongoose.models.Tag || mongoose.model('Tag', tagSchema);
