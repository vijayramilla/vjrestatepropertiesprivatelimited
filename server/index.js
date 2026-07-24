import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ownerContactSchema = new mongoose.Schema({
  propertyId: { type: String, required: true, unique: true, index: true },
  contact_name: { type: String, default: '' },
  contact_phone: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

const OwnerContact = mongoose.model('OwnerContact', ownerContactSchema);

app.post('/api/owner-contact', async (req, res) => {
  try {
    const { propertyId, contact_name, contact_phone } = req.body;
    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }
    const doc = await OwnerContact.findOneAndUpdate(
      { propertyId },
      { contact_name: contact_name ?? '', contact_phone: contact_phone ?? '', updatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.json(doc);
  } catch (error) {
    console.error('POST /api/owner-contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/owner-contacts', async (req, res) => {
  try {
    const q = req.query.q;
    let filter = {};
    if (q) {
      filter = {
        $or: [
          { contact_name: { $regex: q, $options: 'i' } },
          { contact_phone: { $regex: q, $options: 'i' } },
        ],
      };
    }
    const docs = await OwnerContact.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(docs);
  } catch (error) {
    console.error('GET /api/owner-contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/owner-contact/:propertyId', async (req, res) => {
  try {
    const doc = await OwnerContact.findOne({ propertyId: req.params.propertyId });
    res.json(doc ? { contact_name: doc.contact_name, contact_phone: doc.contact_phone } : { contact_name: '', contact_phone: '' });
  } catch (error) {
    console.error('GET /api/owner-contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on :${PORT}`));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
