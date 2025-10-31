/*
  MIT License
  (c) 2025 Christian I. Cabrera || XianFire Framework
*/

import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Product = sequelize.define("Product", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});
