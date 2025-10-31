/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { Sequelize, DataTypes } from "sequelize";
import { fileURLToPath } from "url";
import { dirname } from "path";

const router = express.Router();

// ✅ Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ✅ Sequelize DB (as provided)
export const sequelize = new Sequelize("e-commerce", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false
});

// ✅ Define Models
const User = sequelize.define("User", {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: "customer" }
});

const Product = sequelize.define("Product", {
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  price: DataTypes.FLOAT,
  image: DataTypes.STRING
});

const Order = sequelize.define("Order", {
  total_price: DataTypes.FLOAT,
  status: { type: DataTypes.STRING, defaultValue: "Pending" }
});

const OrderItem = sequelize.define("OrderItem", {
  quantity: DataTypes.INTEGER
});

// ✅ Model Relations
User.hasMany(Order);
Order.belongsTo(User);
Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

// ✅ Sync DB (create tables if not exist)
sequelize.sync({ alter: true });

// ✅ File Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "public/uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") return next();
  res.redirect("/");
}

// ============================
// 🔹 ROUTES START HERE
// ============================

// 🏠 Home Page — Product Listing
router.get("/", async (req, res) => {
  const products = await Product.findAll();
  res.render("home", { products, user: req.session.user });
});

// 👤 Register Page
router.get("/register", (req, res) => res.render("register"));

// ✅ UPDATED: Register with selectable role (admin or customer)
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({
      name,
      email,
      password: hashed,
      role: role || "customer" // ✅ Use chosen role or default to customer
    });
    res.redirect("/login");
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).send("Registration failed. Please try again.");
  }
});

// 👥 Login Page
router.get("/login", (req, res) => {
  // If already logged in
  if (req.session.user) {
    return req.session.user.role === "admin"
      ? res.redirect("/admin/dashboard")
      : res.redirect("/home");
  }
  res.render("login");
});

// ✅ FIXED ADMIN LOGIN LOGIC
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.send("No account found with this email.");

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.send("Incorrect password.");

    // ✅ Save session
    req.session.user = {
      id: user.id,
      role: user.role,
      name: user.name
    };

    // ✅ Role-based redirect
    if (req.session.user) {
      return req.session.user.role === "admin"
        ? res.redirect("/admin/dashboard")
        : res.redirect("/");
    }

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
});

// 🚪 Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// 🛒 Add to Cart (session)
router.post("/cart/add/:id", async (req, res) => {
  const id = req.params.id;
  const product = await Product.findByPk(id);
  if (!product) return res.send("Product not found.");

  if (!req.session.cart) req.session.cart = [];

  const existing = req.session.cart.find(p => p.id == id);
  if (existing) existing.qty++;
  else req.session.cart.push({
    id,
    name: product.name,
    price: product.price,
    qty: 1
  });

  res.redirect("/cart");
});

// ✅ Update cart quantity (from frontend form)
router.post("/cart/update/:id", async (req, res) => {
  const id = req.params.id;
  const qty = parseInt(req.body.qty);

  if (!req.session.cart) req.session.cart = [];

  const item = req.session.cart.find(p => p.id == id);
  if (item) {
    item.qty = qty > 0 ? qty : 1; // prevent 0 or negative
  }

  res.redirect("/cart");
});

// 🛍 Cart Page
router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, p) => sum + p.price * p.qty, 0);
  res.render("cart", { cart, total, user: req.session.user });
});

// 💳 Checkout
router.post("/checkout", isAuthenticated, async (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect("/cart");

  const total = cart.reduce((sum, p) => sum + p.price * p.qty, 0);

  // ✅ FIXED: Save with UserId (foreign key)
  const order = await Order.create({
    UserId: req.session.user.id,
    total_price: total
  });

  for (const item of cart) {
    await OrderItem.create({
      OrderId: order.id,
      ProductId: item.id,
      quantity: item.qty
    });
  }

  req.session.cart = [];
  res.render("checkout", { order, user: req.session.user });
});

// 👨‍💼 Admin Dashboard
router.get("/admin", isAdmin, async (req, res) => {
  const products = await Product.findAll();
  const orders = await Order.findAll({ include: User });
  res.render("admin/dashboard", { products, orders, user: req.session.user });
});

// ✅ Alias route for admin dashboard (so /admin/dashboard works)
router.get("/admin/dashboard", isAdmin, async (req, res) => {
  const products = await Product.findAll();
  const orders = await Order.findAll({ include: User });
  res.render("admin/dashboard", { products, orders, user: req.session.user });
});

// 🧩 Add Product
router.post("/admin/products", isAdmin, upload.single("image"), async (req, res) => {
  const { name, description, price } = req.body;
  const image = "/uploads/" + req.file.filename;
  await Product.create({ name, description, price, image });
  res.redirect("/admin");
});

// 🗑 Delete Product
router.post("/admin/products/delete/:id", isAdmin, async (req, res) => {
  await Product.destroy({ where: { id: req.params.id } });
  res.redirect("/admin");
});

// ✅ Update Order Status
router.post("/admin/orders/update/:id", isAdmin, async (req, res) => {
  await Order.update({ status: req.body.status }, { where: { id: req.params.id } });
  res.redirect("/admin");
});

// 📦 Customer Order Status Page
router.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { UserId: req.session.user.id }, // ✅ Only show orders for this user
      include: [
        {
          model: Product,
          through: { attributes: ["quantity"] } // show product qty per order
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.render("orders", { orders, user: req.session.user });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.status(500).send("Unable to load your orders at this time.");
  }
});

export default router;
