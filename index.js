// export default app; // Use ES Module export
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import axios from "axios";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

const CURRENCY_API_URL = "https://v6.exchangerate-api.com/v6";
const CURRENCY_API_KEY = "9dc864c4df843b269f7114d9"; // Replace with your Exchange Rate API key

const BACKUP_CURRENCY_API_URL = "https://api.api-ninjas.com/v1/exchangerate";
const BACKUP_CURRENCY_API_KEY = "rHG8nY8vpqhpt9Gg6ouNdQ==8gIu0SNRoFmSwCx3"; // Replace with your API Ninjas key

const IP_API_URL = "http://ip-api.com/json/";

async function getCountryFromIP(ip) {
  try {
    const response = await axios.get(`${IP_API_URL}${ip}`);
    if (response.data.status !== "success") throw new Error("Invalid response");

    const countryCode = response.data.countryCode;
    console.log("Country Code:", countryCode); // ✅ DEBUG: Log country code
    console.log("IP Data Response:", response.data);
    return countryCode || null;
  } catch (error) {
    console.error("Error fetching country from IP:", error.message);
    return null;
  }
}

async function getCurrencyByCountry(countryCode) {
  try {
    const response = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`);
    if (!response.data || response.data.length === 0) throw new Error("No country data found.");

    const countryData = response.data[0];
    if (!countryData.currencies) throw new Error("No currency data available.");

    const currencyCode = Object.keys(countryData.currencies)[0];
    console.log("Currency Code:", currencyCode);

    return currencyCode;
  } catch (error) {
    console.error("Error fetching currency:", error.message);
    return null;
  }
}

async function getExchangeRate(currencyCode) {
  try {
    // Primary API
    const response = await axios.get(`${CURRENCY_API_URL}/${CURRENCY_API_KEY}/latest/USD`);
    const exchangeRate = response.data.conversion_rates[currencyCode];
    if (!exchangeRate) throw new Error("Primary API: No exchange rate found.");
    
    return exchangeRate;
  } catch (error) {
    console.error("Primary API Error:", error.message);
    
    // Backup API
    return await getExchangeRateBackup(currencyCode);
  }
}

async function getExchangeRateBackup(currencyCode) {
  try {
    const response = await axios.get(`${BACKUP_CURRENCY_API_URL}?pair=USD_${currencyCode}`, {
      headers: { "X-Api-Key": BACKUP_CURRENCY_API_KEY },
    });

    if (!response.data.exchange_rate) throw new Error("Backup API: No exchange rate found.");

    console.log("Backup Exchange Rate:", response.data.exchange_rate);
    return response.data.exchange_rate;
  } catch (error) {
    console.error("Backup API Error:", error.message);
    return null;
  }
}

// Root Route
app.post("/get-currency", async (req, res) => {
  const { priceUSD } = req.body;
  const ip =  req.body.ip ||  req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (ip && ip.includes(",")) ip = ip.split(",")[0].trim();

  if (!ip) {
    return res.status(400).json({ error: "Could not retrieve IP address." });
  }

  const countryCode = await getCountryFromIP(ip);
  if (!countryCode) return res.status(500).json({ error: "Could not determine country." });

  const currencyCode = await getCurrencyByCountry(countryCode);
  if (!currencyCode) return res.status(500).json({ error: "Could not determine currency." });

  const exchangeRate = await getExchangeRate(currencyCode);
  if (exchangeRate === null) return res.status(500).json({ error: "Could not fetch exchange rate." });

  // Convert price to local currency
  const finalPrice = (priceUSD * exchangeRate).toFixed(2);

  res.json({
    countryCode,
    currency: currencyCode,
    exchangeRate: `1 USD = ${exchangeRate} ${currencyCode}`,
    finalPrice: `${finalPrice} ${currencyCode}`,
  });
});

// Start the server
const port = process.env.SERVER_PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
