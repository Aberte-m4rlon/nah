// models/productModel.js
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});
