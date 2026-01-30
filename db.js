const Database = require("better-sqlite3");

// Render/Hosting par file system temporary ho sakta hai,
// lekin start ke liye SQLite simple & perfect hai.
const db = new Database("payokart.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT,
  phone TEXT,
  address TEXT,
  area TEXT,
  milk_type TEXT,
  litres REAL,
  payment_mode TEXT,
  delivery_fee INTEGER DEFAULT 0,
  rider_payout INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;
