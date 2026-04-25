const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB = {
  hero: path.join(DATA_DIR, 'hero.json'),
  products: path.join(DATA_DIR, 'products.json'),
  reviews: path.join(DATA_DIR, 'reviews.json'),
  contacts: path.join(DATA_DIR, 'contacts.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  admin: path.join(DATA_DIR, 'admin.json'),
};

Object.values(DB).forEach(file => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify([], null, 2));
});

const readDB = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeDB = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Initialize defaults
const settings = readDB(DB.settings);
if (!settings.length) {
  writeDB(DB.settings, [{
    id: 'default',
    siteTitle: 'BLAGOFU.K',
    whatsappNumber: '',
    theme: 'dark',
    heroTextColor: '#ffffff',
    primaryColor: '#c9a96e',
    secondaryColor: '#ffffff'
  }]);
}

const admin = readDB(DB.admin);
if (!admin.length) {
  writeDB(DB.admin, [{ username: 'admin', password: 'admin123' }]);
}

const contacts = readDB(DB.contacts);
if (!contacts.length) {
  writeDB(DB.contacts, [{
    id: 'default',
    phone: '',
    email: '',
    address: '',
    socialLinks: { instagram: '', facebook: '', twitter: '' }
  }]);
}

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const admin = readDB(DB.admin);
  const user = admin.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, token: 'blagofuk-admin-token', user: { username: user.username } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.put('/api/auth/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = readDB(DB.admin);
  const user = admin.find(u => u.password === currentPassword);
  if (!user) return res.status(401).json({ success: false, message: 'Current password incorrect' });
  user.password = newPassword;
  writeDB(DB.admin, admin);
  res.json({ success: true });
});

// ============ HERO ============
app.get('/api/hero', (req, res) => {
  const hero = readDB(DB.hero);
  res.json(hero[0] || null);
});

app.post('/api/hero', upload.single('image'), (req, res) => {
  const hero = readDB(DB.hero);
  const data = { id: 'hero', ...req.body };
  if (req.file) data.image = `/uploads/${req.file.filename}`;
  writeDB(DB.hero, [data]);
  res.json({ success: true, data });
});

app.put('/api/hero', upload.single('image'), (req, res) => {
  const hero = readDB(DB.hero);
  const existing = hero[0] || { id: 'hero' };
  const updated = { ...existing, ...req.body };
  if (req.file) updated.image = `/uploads/${req.file.filename}`;
  writeDB(DB.hero, [updated]);
  res.json({ success: true, data: updated });
});

// ============ PRODUCTS ============
app.get('/api/products', (req, res) => {
  res.json(readDB(DB.products));
});

app.post('/api/products', upload.single('image'), (req, res) => {
  const products = readDB(DB.products);
  const product = {
    id: uuidv4(),
    name: req.body.name,
    price: req.body.price || '',
    description: req.body.description || '',
    image: req.file ? `/uploads/${req.file.filename}` : '',
    createdAt: new Date().toISOString()
  };
  products.push(product);
  writeDB(DB.products, products);
  res.json({ success: true, data: product });
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const products = readDB(DB.products);
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Product not found' });
  
  const updated = { ...products[index], ...req.body };
  if (req.file) updated.image = `/uploads/${req.file.filename}`;
  products[index] = updated;
  writeDB(DB.products, products);
  res.json({ success: true, data: updated });
});

app.delete('/api/products/:id', (req, res) => {
  const products = readDB(DB.products);
  const filtered = products.filter(p => p.id !== req.params.id);
  writeDB(DB.products, filtered);
  res.json({ success: true });
});

// ============ REVIEWS ============
app.get('/api/reviews', (req, res) => {
  res.json(readDB(DB.reviews));
});

app.post('/api/reviews', upload.single('image'), (req, res) => {
  const reviews = readDB(DB.reviews);
  const review = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  if (req.file) review.image = `/uploads/${req.file.filename}`;
  reviews.push(review);
  writeDB(DB.reviews, reviews);
  res.json({ success: true, data: review });
});

app.put('/api/reviews/:id', upload.single('image'), (req, res) => {
  const reviews = readDB(DB.reviews);
  const index = reviews.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false });
  reviews[index] = { ...reviews[index], ...req.body };
  if (req.file) reviews[index].image = `/uploads/${req.file.filename}`;
  writeDB(DB.reviews, reviews);
  res.json({ success: true, data: reviews[index] });
});

app.delete('/api/reviews/:id', (req, res) => {
  const reviews = readDB(DB.reviews);
  const filtered = reviews.filter(r => r.id !== req.params.id);
  writeDB(DB.reviews, filtered);
  res.json({ success: true });
});

// ============ CONTACTS ============
app.get('/api/contacts', (req, res) => {
  const contacts = readDB(DB.contacts);
  res.json(contacts[0] || null);
});

app.put('/api/contacts', (req, res) => {
  const contacts = readDB(DB.contacts);
  const updated = { id: 'default', ...(contacts[0] || {}), ...req.body };
  writeDB(DB.contacts, [updated]);
  res.json({ success: true, data: updated });
});

// ============ MESSAGES ============
app.get('/api/messages', (req, res) => {
  res.json(readDB(DB.messages));
});

app.post('/api/messages', (req, res) => {
  const messages = readDB(DB.messages);
  const message = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString(), read: false };
  messages.unshift(message);
  writeDB(DB.messages, messages);
  res.json({ success: true, data: message });
});

app.put('/api/messages/:id/read', (req, res) => {
  const messages = readDB(DB.messages);
  const index = messages.findIndex(m => m.id === req.params.id);
  if (index !== -1) {
    messages[index].read = true;
    writeDB(DB.messages, messages);
  }
  res.json({ success: true });
});

app.delete('/api/messages/:id', (req, res) => {
  const messages = readDB(DB.messages);
  const filtered = messages.filter(m => m.id !== req.params.id);
  writeDB(DB.messages, filtered);
  res.json({ success: true });
});

// ============ SETTINGS ============
app.get('/api/settings', (req, res) => {
  const settings = readDB(DB.settings);
  res.json(settings[0] || null);
});

app.put('/api/settings', (req, res) => {
  const settings = readDB(DB.settings);
  const updated = { id: 'default', ...(settings[0] || {}), ...req.body };
  writeDB(DB.settings, [updated]);
  res.json({ success: true, data: updated });
});

// ============ IMAGE RESIZE/DELETE ============
app.delete('/api/images/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BLAGOFU.K API running on port ${PORT}`);
});
