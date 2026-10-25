const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

// Models
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: String,
  description: String,
  price: {
    type: Number,
    required: true,
  },
  comparePrice: Number,
  image: String, // Single image for simple products
  images: [
    {
      url: String,
      alt: String,
    },
  ],
  category: {
    type: String,
    required: true,
  },
  audience: {
    type: String,
    enum: ["men", "women", "unisex"],
    default: "unisex",
  },
  collection: String,
  stock: {
    type: Number,
    default: 0,
  },
  featured: Boolean,
  variants: [
    {
      size: {
        type: String,
        enum: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
      },
      color: String,
      colorHex: String,
      stock: {
        type: Number,
        default: 0,
      },
    },
  ],
  fabric: String,
  care: String,
  sizeGuide: [
    {
      size: String,
      chest: String,
      length: String,
    },
  ],
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: Boolean,
  isNew: Boolean,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  }
  next();
});

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    zip: String,
    country: { type: String, default: "Pakistan" },
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      name: String,
      image: String,
      size: String,
      color: String,
      quantity: Number,
      price: Number,
    },
  ],
  subtotal: Number,
  shippingCost: {
    type: Number,
    default: 0,
  },
  discount: {
    code: String,
    amount: Number,
  },
  total: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "bank_transfer"],
    default: "cod",
  },
  status: {
    type: String,
    enum: ["received", "processing", "shipped", "delivered", "cancelled"],
    default: "received",
  },
  trackingNumber: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `NM${String(count + 1001).padStart(6, "0")}`;
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const Newsletter =
  mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);

// ================== ROUTES ==================

// Health check
app.get("/api", async (req, res) => {
  try {
    await connectDB();
    res.json({
      message: "NORTHMARK Backend API (Netlify)",
      status: "running",
      version: "1.0.0",
      database: isConnected ? "connected" : "disconnected",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Database connection error", error: error.message });
  }
});

// ===== PRODUCT ROUTES =====

// GET /api/products - Get all products
app.get("/api/products", async (req, res) => {
  try {
    await connectDB();
    const { category, audience, collection, sort, limit, featured } = req.query;

    let query = {};
    if (category) query.category = category;
    if (audience) query.audience = audience;
    if (collection) query.collection = collection;
    if (featured) query.featured = featured === "true";

    let products = Product.find(query);

    if (sort === "price_low") products = products.sort({ price: 1 });
    if (sort === "price_high") products = products.sort({ price: -1 });
    if (sort === "newest") products = products.sort({ createdAt: -1 });
    if (sort === "rating") products = products.sort({ rating: -1 });

    if (limit) products = products.limit(parseInt(limit));

    const result = await products;
    res.json({ success: true, count: result.length, products: result });
  } catch (error) {
    console.error("Products API Error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: error.message,
        error: error.toString(),
      });
  }
});

// GET /api/products/:id - Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products - Create product
app.post("/api/products", async (req, res) => {
  try {
    await connectDB();
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/products/:id - Update product
app.put("/api/products/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/products/:id - Delete product
app.delete("/api/products/:id", async (req, res) => {
  try {
    await connectDB();
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ===== ORDER ROUTES =====

// GET /api/orders - Get all orders
app.get("/api/orders", async (req, res) => {
  try {
    await connectDB();
    const { status, email, limit } = req.query;

    let query = {};
    if (status) query.status = status;
    if (email) query["customer.email"] = email;

    let orders = Order.find(query).sort({ createdAt: -1 });

    if (limit) orders = orders.limit(parseInt(limit));

    const result = await orders.populate("items.product");
    res.json({ success: true, count: result.length, orders: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/orders/:id - Get single order
app.get("/api/orders/:id", async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/orders - Create order
app.post("/api/orders", async (req, res) => {
  try {
    await connectDB();
    const order = await Order.create(req.body);
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/orders/:id - Update order
app.put("/api/orders/:id", async (req, res) => {
  try {
    await connectDB();
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ===== NEWSLETTER ROUTES =====

// POST /api/newsletter/subscribe - Subscribe to newsletter
app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    await connectDB();
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email });
    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ message: "Email already subscribed" });
      } else {
        // Reactivate subscription
        existing.isActive = true;
        await existing.save();
        return res.json({ success: true, message: "Subscription reactivated" });
      }
    }

    const subscriber = await Newsletter.create({ email });
    res
      .status(201)
      .json({ success: true, message: "Successfully subscribed", subscriber });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/newsletter - Get all subscribers (admin)
app.get("/api/newsletter", async (req, res) => {
  try {
    await connectDB();
    const subscribers = await Newsletter.find({ isActive: true }).sort({
      subscribedAt: -1,
    });
    res.json({ success: true, count: subscribers.length, subscribers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export handler
module.exports.handler = serverless(app);
