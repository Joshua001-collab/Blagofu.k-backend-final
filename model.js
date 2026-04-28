const mongoose = require('mongoose');

// PRODUCT
const productSchema = new mongoose.Schema({
  name: String,
  price: String,
  description: String,
  image: {
    data: Buffer,
    contentType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// HERO
const heroSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  image: {
    data: Buffer,
    contentType: String
  }
});

// REVIEW
const reviewSchema = new mongoose.Schema({
  name: String,
  message: String,
  image: {
    data: Buffer,
    contentType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = {
  Product: mongoose.model('Product', productSchema),
  Hero: mongoose.model('Hero', heroSchema),
  Review: mongoose.model('Review', reviewSchema),
};