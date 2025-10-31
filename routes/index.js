/*
    MIT License

    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { Sequelize, DataTypes, Op } from "sequelize";
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
  role: { type: DataTypes.STRING, defaultValue: "customer" } // admin | seller | customer
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
User.hasMany(Product);
Product.belongsTo(User);

// ✅ Sync DB
sequelize.sync({ alter: true });

// ✅ File Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), "public/uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// ✅ Middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") return next();
  res.redirect("/");
}

function isSeller(req, res, next) {
  if (req.session.user && req.session.user.role === "seller") return next();
  res.redirect("/");
}

// ============================
// 🔹 ROUTES START HERE
// ============================

// 🏠 Home Page
router.get("/", async (req, res) => {
  const products = await Product.findAll();
  res.render("home", { products, user: req.session.user });
});

// 👤 Register Page
router.get("/register", (req, res) => res.render("register"));

// ✅ Register with Role
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    await User.create({
      name,
      email,
      password: hashed,
      role: role || "customer"
    });
    res.redirect("/login");
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).send("Registration failed. Please try again.");
  }
});

// 👥 Login Page
router.get("/login", (req, res) => {
  if (req.session.user) {
    // ✅ Auto redirect if already logged in
    switch (req.session.user.role) {
      case "admin":
        return res.redirect("/admin/dashboard");
      case "seller":
        return res.redirect("/seller/dashboard");
      default:
        return res.redirect("/"); // Customer = main shop
    }
  }
  res.render("login");
});

// ✅ Login Logic (fixed redirects)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.send("No account found with this email.");

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.send("Incorrect password.");

    // ✅ Store session
    req.session.user = {
      id: user.id,
      role: user.role,
      name: user.name
    };

    // ✅ Redirect by role
    if (user.role === "admin") return res.redirect("/admin/dashboard");
    if (user.role === "seller") return res.redirect("/seller/dashboard");
    return res.redirect("/"); // Customer goes to shop home
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error.");
  }
});

// 🚪 Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// 🛒 Add to Cart
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

// ✅ Update cart quantity
router.post("/cart/update/:id", async (req, res) => {
  const id = req.params.id;
  const qty = parseInt(req.body.qty);
  if (!req.session.cart) req.session.cart = [];

  const item = req.session.cart.find(p => p.id == id);
  if (item) item.qty = qty > 0 ? qty : 1;
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
// 🧑‍💼 SELLER DASHBOARD
router.get("/seller/dashboard", isSeller, async (req, res) => {
  const sellerId = req.session.user.id;

  // ✅ Only show products owned by this seller
  const products = await Product.findAll({
    where: { UserId: sellerId }
  });

  // ✅ Only show orders that include this seller’s products
  const orders = await Order.findAll({
    include: [
      { model: User }, // Include customer info
      {
        model: Product,
        where: { UserId: sellerId }, // Filter only seller's products
        through: { attributes: ["quantity"] }
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  res.render("seller/dashboard", { products, orders, user: req.session.user });
});

router.get("/", async (req, res) => {
  const allProducts = await Product.findAll();
  const featuredProducts = await Product.findAll({ limit: 5, order: [["createdAt", "DESC"]] }); // latest or featured
  res.render("home", { products: allProducts, featuredProducts, user: req.session.user });
});

// 🧩 Add Product (Seller)
router.post("/seller/products", isSeller, upload.single("image"), async (req, res) => {
  const { name, description, price } = req.body;
  const image = "/uploads/" + req.file.filename;
  await Product.create({
    name,
    description,
    price,
    image,
    UserId: req.session.user.id
  });
  res.redirect("/seller/dashboard");
});

// 🗑 Delete Product
router.post("/seller/products/delete/:id", isSeller, async (req, res) => {
  await Product.destroy({ where: { id: req.params.id, UserId: req.session.user.id } });
  res.redirect("/seller/dashboard");
});

// ✅ Update Order Status
router.post("/seller/orders/update/:id", isSeller, async (req, res) => {
  await Order.update({ status: req.body.status }, { where: { id: req.params.id } });
  res.redirect("/seller/dashboard");
});

// 👑 ADMIN DASHBOARD — manage users and counts
router.get("/admin/dashboard", isAdmin, async (req, res) => {
  const users = await User.findAll({
    where: {
      role: {
        [Op.in]: ["seller", "customer"]
      }
    }
  });

  const sellerCount = users.filter(u => u.role === "seller").length;
  const customerCount = users.filter(u => u.role === "customer").length;

  res.render("admin/dashboard", {
    users,
    sellerCount,
    customerCount,
    user: req.session.user
  });
});

// ✅ Admin Add Seller
router.post("/admin/add-seller", isAdmin, async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, role: "seller" });
  res.redirect("/admin/dashboard");
});

// 📦 Customer Orders
router.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { UserId: req.session.user.id },
      include: [{ model: Product, through: { attributes: ["quantity"] } }],
      order: [["createdAt", "DESC"]]
    });
    res.render("orders", { orders, user: req.session.user });
  } catch (err) {
    console.error("Error loading orders:", err);
    res.status(500).send("Unable to load your orders at this time.");
  }
});

export default router;
