require("dotenv").config();
const express = require("express");
const QRCode = require("qrcode");
const cron = require("node-cron");
const db = require("./db");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// ---------- Settings ----------
const PORT = process.env.PORT || 3000;
const BRAND = "Payokart";

// -------- Helpers --------
function isOrderWindowOpen() {
  return true; // 24x7 open
}
function getPrices() {
  return { cow: 50, buffalo: 60, mix: 70 };
}

function calcCharges(litres) {
  const L = Number(litres);
  const deliveryBase = Number(process.env.DELIVERY_BASE_FEE || 10);
  const deliveryPerLitre = Number(process.env.DELIVERY_PER_LITRE || 2);
  const riderBase = Number(process.env.RIDER_PAYOUT_BASE || 8);
  const riderPerOrder = Number(process.env.RIDER_PAYOUT_PER_ORDER || 2);

  return {
    delivery_fee: Math.round(deliveryBase + deliveryPerLitre * L),
    rider_payout: Math.round(riderBase + riderPerOrder),
  };
}

function buildUpiLink({ vpa, name, amount, note }) {
  const p = new URLSearchParams();
  p.set("pa", vpa);
  p.set("pn", name);
  p.set("am", Number(amount).toFixed(2));
  p.set("tn", note || `${BRAND} Order`);
  p.set("cu", "INR");
  return `upi://pay?${p.toString()}`;
}

// ---------- Pages ----------
app.get("/", (req, res) =>
  res.render("index", { brand: BRAND, open: isOrderWindowOpen() })
);

app.get("/order", (req, res) =>
  res.render("order", {
    brand: BRAND,
    open: isOrderWindowOpen(),
    prices: getPrices(),
  })
);

// ---------- Create Order ----------
app.post("/order", async (req, res) => {
  if (!isOrderWindowOpen())
    return res.status(400).send("Order window closed.");

  const prices = getPrices();
  const {
    customer_name,
    phone,
    address,
    area,
    milk_type,
    litres,
    payment_mode,
  } = req.body;

  const qty = Number(litres || 0);
  const milkAmount = (prices[milk_type] || 0) * qty;
  const { delivery_fee, rider_payout } = calcCharges(qty);
  const total_amount = Math.round(milkAmount + delivery_fee);

  const info = db
    .prepare(
      `INSERT INTO orders
      (customer_name, phone, address, area, milk_type, litres, payment_mode, delivery_fee, rider_payout, total_amount)
      VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      customer_name || "",
      phone || "",
      address || "",
      area || "",
      milk_type || "cow",
      qty,
      payment_mode || "cod",
      delivery_fee,
      rider_payout,
      total_amount
    );

  let qrDataUrl = null;
  if (payment_mode === "upi" && process.env.UPI_VPA) {
    const link = buildUpiLink({
      vpa: process.env.UPI_VPA,
      name: process.env.UPI_PAYEE_NAME || BRAND,
      amount: total_amount,
      note: `${BRAND} Order ${info.lastInsertRowid}`,
    });
    qrDataUrl = await QRCode.toDataURL(link);
  }

  res.render("success", { brand: BRAND, total_amount, qrDataUrl });
});

// ---------- Daily reset (optional) ----------
cron.schedule("0 0 * * *", () => {
  // future use
});

// Start server (ALWAYS LAST)
app.listen(PORT, () => {
  console.log(`${BRAND} running on port ${PORT}`);
});
