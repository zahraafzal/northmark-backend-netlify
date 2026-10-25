const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db('northmark');
  cachedDb = db;
  return db;
}

// Routes

// Health check
app.get('/api', (req, res) => {
  res.json({ 
    message: 'NORTHMARK Backend API (Netlify)',
    status: 'running',
    version: '1.0.0'
  });
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const products = await db.collection('products').find({}).toArray();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { ObjectId } = require('mongodb');
    const product = await db.collection('products').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const order = {
      ...req.body,
      orderNumber: `NM${Date.now().toString().slice(-6)}`,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ 
      success: true, 
      orderId: result.insertedId,
      orderNumber: order.orderNumber,
      message: 'Order placed successfully' 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const orders = await db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { ObjectId } = require('mongodb');
    const order = await db.collection('orders').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Newsletter subscription
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const existing = await db.collection('newsletter').findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    
    await db.collection('newsletter').insertOne({
      email,
      subscribedAt: new Date()
    });
    
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Error subscribing:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Export the serverless function
module.exports.handler = serverless(app);
