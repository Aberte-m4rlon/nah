// models/orderModel.js
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { User } from "./userModel.js";
import { Product } from "./productModel.js";

export const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "Pending"
  }
});

// Define relationships
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

// Optional: many-to-many between Order and Product
export const OrderItem = sequelize.define("OrderItem", {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  }
});

Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });
