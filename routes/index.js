/*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines
*/

import express from "express";
import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Product } from "../models/productModel.js";
import { Order, OrderItem } from "../models/orderModel.js";

const router = express.Router();

// 🏠 Home Page
router.get("/", async (req, res) => {
  res.render("home", { user: req.session.user });
});

// 🧍 Register Page
router.get("/register", (req, res) => {
  res.render("register");
});

// 🧍 Register Handler
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.send("⚠️ User already exists");

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    req.session.user = user;
    res.redirect("/products");
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).send("Registration failed");
  }
});

// 🔑 Login Page
router.get("/login", (req, res) => {
  res.render("login");
});

// 🔑 Login Handler
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.send("❌ User not found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("❌ Invalid credentials");

    req.session.user = user;
    res.redirect("/products");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed");
  }
});

// 🚪 Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// 🛍 Product Listing
router.get("/products", async (req, res) => {
  try {
    const products = await Product.findAll();
    res.render("orders", { user: req.session.user, products });
  } catch (err) {
    console.error("Product fetch error:", err);
    res.status(500).send("Failed to load products");
  }
});

// ➕ Add to Cart
router.post("/add-to-cart", async (req, res) => {
  const { id } = req.body;
  const product = await Product.findByPk(id);
  if (!product) return res.send("Product not found");

  if (!req.session.cart) req.session.cart = [];
  req.session.cart.push(product);
  res.redirect("/cart");
});

// 🛒 View Cart
router.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  res.render("cart", { user: req.session.user, cart, total });
});

// 💳 Checkout
router.post("/checkout", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");

    const cart = req.session.cart || [];
    const total = cart.reduce((s, p) => s + p.price, 0);

    const order = await Order.create({
      userId: req.session.user.id,
      total,
      status: "Pending"
    });

    for (const item of cart) {
      await OrderItem.create({
        OrderId: order.id,
        ProductId: item.id,
        quantity: 1
      });
    }

    req.session.cart = [];
    res.render("checkout", { user: req.session.user, order });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).send("Checkout failed");
  }
});

// 📦 View Order History
router.get("/orders", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const orders = await Order.findAll({
      where: { userId: req.session.user.id },
      include: [ { model: OrderItem, include: [ { model: Product } ] } ]
    });

    res.render("dashboard", { user: req.session.user, orders });
  } catch (err) {
    console.error("Order history error:", err);
    res.status(500).send("Failed to load orders");
  }
});

export default router;
