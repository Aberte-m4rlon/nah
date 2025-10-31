import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

const Product = sequelize.define("Product", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  price: { type: DataTypes.FLOAT, allowNull: false },
  image: { type: DataTypes.STRING },
  quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
});

export default Product;
