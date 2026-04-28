const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { connectDB } = require('./db');
const { Product, Hero, Review } = require('./model');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect DB
connectDB();

// ================= AUTH MIDDLEWARE =================
const requireAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token || token !== 'Bearer blagofuk-admin-token') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// Multer (store images in memory → MongoDB)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ================= AUTH =================
let adminUser = { username: 'admin', password: 'admin123' };

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === adminUser.username && password === adminUser.password) {
    return res.json({
      success: true,
      token: 'blagofuk-admin-token',
      user: { username }
    });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.put('/api/auth/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (currentPassword !== adminUser.password) {
    return res.status(401).json({ success: false, message: 'Current password incorrect' });
  }

  adminUser.password = newPassword;
  res.json({ success: true });
});

// ================= HERO =================
app.get('/api/hero', async (req, res) => {
  const hero = await Hero.findOne();

  if (!hero) return res.json(null);

  res.json({
    ...hero._doc,
    image: hero.image?.data?.toString('base64'),
    contentType: hero.image?.contentType
  });
});

app.post('/api/hero', requireAuth, upload.single('image'), async (req, res) => {
  let hero = await Hero.findOne();

  const data = { ...req.body };

  if (req.file) {
    data.image = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };
  }

  if (hero) {
    hero = await Hero.findByIdAndUpdate(hero._id, data, { new: true });
  } else {
    hero = new Hero(data);
    await hero.save();
  }

  res.json({ success: true, data: hero });
});

// ================= PRODUCTS =================
app.get('/api/products', async (req, res) => {
  const products = await Product.find();

  const formatted = products.map(p => ({
    _id: p._id,
    name: p.name,
    price: p.price,
    description: p.description,
    image: p.image?.data?.toString('base64'),
    contentType: p.image?.contentType,
    createdAt: p.createdAt
  }));

  res.json(formatted);
});

app.post('/api/products', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      image: req.file
        ? {
            data: req.file.buffer,
            contentType: req.file.mimetype
          }
        : null
    });

    await product.save();
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAuth, upload.single('image'), async (req, res) => {
  const updateData = { ...req.body };

  if (req.file) {
    updateData.image = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };
  }

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  res.json({ success: true, data: updated });
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= REVIEWS =================
app.get('/api/reviews', async (req, res) => {
  const reviews = await Review.find();

  const formatted = reviews.map(r => ({
    ...r._doc,
    image: r.image?.data?.toString('base64'),
    contentType: r.image?.contentType
  }));

  res.json(formatted);
});

app.post('/api/reviews', requireAuth, upload.single('image'), async (req, res) => {
  const review = new Review({
    ...req.body,
    image: req.file
      ? {
          data: req.file.buffer,
          contentType: req.file.mimetype
        }
      : null
  });

  await review.save();
  res.json({ success: true, data: review });
});

app.put('/api/reviews/:id', requireAuth, upload.single('image'), async (req, res) => {
  const updateData = { ...req.body };

  if (req.file) {
    updateData.image = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };
  }

  const updated = await Review.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  );

  res.json({ success: true, data: updated });
});

app.delete('/api/reviews/:id', requireAuth, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= CONTACTS (TEMP MEMORY) =================
let contactsData = {
  phone: '',
  email: '',
  address: '',
  socialLinks: { instagram: '', facebook: '', twitter: '' }
};

app.get('/api/contacts', (req, res) => {
  res.json(contactsData);
});

app.put('/api/contacts', requireAuth, (req, res) => {
  contactsData = { ...contactsData, ...req.body };
  res.json({ success: true, data: contactsData });
});

// ================= MESSAGES (TEMP MEMORY) =================
let messages = [];

app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const message = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    read: false
  };

  messages.unshift(message);
  res.json({ success: true, data: message });
});

app.put('/api/messages/:id/read', requireAuth, (req, res) => {
  const msg = messages.find(m => m.id === req.params.id);
  if (msg) msg.read = true;
  res.json({ success: true });
});

app.delete('/api/messages/:id', requireAuth, (req, res) => {
  messages = messages.filter(m => m.id !== req.params.id);
  res.json({ success: true });
});

// ================= SETTINGS (TEMP MEMORY) =================
let settingsData = {
  siteTitle: 'BLAGOFU.K',
  whatsappNumber: '',
  theme: 'dark',
  heroTextColor: '#ffffff',
  primaryColor: '#c9a96e',
  secondaryColor: '#ffffff'
};

app.get('/api/settings', (req, res) => {
  res.json(settingsData);
});

app.put('/api/settings', requireAuth, (req, res) => {
  settingsData = { ...settingsData, ...req.body };
  res.json({ success: true, data: settingsData });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🚀 BLAGOFU.K API running on port ${PORT}`);
});