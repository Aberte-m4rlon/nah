import { Product } from '../models/index.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
export const upload = multer({ storage });

export const list = async (req, res) => {
  const products = await Product.findAll();
  res.render('products/index', { products });
};

export const showCreate = (req, res) => res.render('products/create');
export const create = async (req, res) => {
  const { title, description, price, qty } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  await Product.create({ title, description, price, qty, image, slug: title.toLowerCase().replace(/\s+/g,'-') });
  res.redirect('/products');
};

export const show = async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.redirect('/products');
  res.render('products/show', { product });
};
