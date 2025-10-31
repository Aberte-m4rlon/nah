import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import User from "./userModel.js";

const Order = sequelize.define("Order", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  items: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.ENUM("pending", "paid", "shipped", "completed"), defaultValue: "pending" },
});

User.hasMany(Order);
Order.belongsTo(User);

export default Order;
