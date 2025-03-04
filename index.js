import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import axios from "axios"
  // Replace with your API key

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    credentials: true,
    origin: true
  })
);
const CURRENCY_API_URL = "https://v6.exchangerate-api.com/v6";
const CURRENCY_API_KEY = "9dc864c4df843b269f7114d9"; // Replace with your actual Exchange Rate API key

async function getCountryFromCoords(lat, lng) {
  try {
      const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
          params: { lat, lon: lng, format: "json" }
      });

      const countryCode = response.data.address?.country_code?.toUpperCase();
      console.log("Country Code:", countryCode); // ✅ DEBUG: Log country code

      return countryCode || null;
  } catch (error) {
      console.error("Error fetching country:", error.message);
      return null;
  }
}
async function getCurrencyByCountryBackup(countryCode) {
  try {
      const response = await axios.get(`https://api.api-ninjas.com/v1/country?name=${countryCode}`, {
          headers: { 'X-Api-Key': 'YOUR_API_NINJAS_KEY' }
      });

      if (!response.data || response.data.length === 0) {
          throw new Error("Backup API: No country data found.");
      }

      const currencyCode = response.data[0].currency?.code;
      console.log("Backup Currency Code:", currencyCode);

      return currencyCode || null;
  } catch (error) {
      console.error("Backup API Error fetching currency:", error.message);
      return null;
  }
}
async function getCurrencyByCountry(countryCode) {
  try {
      const response = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`);

      console.log("Country Data Response:", response.data); // Debugging log

      if (!response.data || response.data.length === 0) {
          throw new Error("No country data found.");
      }

      const countryData = response.data[0];

      if (!countryData.currencies) {
          throw new Error("No currency data available.");
      }

      const currencyCode = Object.keys(countryData.currencies)[0];
      console.log("Currency Code:", currencyCode);

      return currencyCode;
  } catch (error) {
      console.error("Error fetching currency:", error.message);
      
      // If restcountries API fails, use a backup
      return await getCurrencyByCountryBackup(countryCode);
  }
}
async function getExchangeRate(currencyCode) {
  try {
      const response = await axios.get(`${CURRENCY_API_URL}/${CURRENCY_API_KEY}/latest/USD`);
      return response.data.conversion_rates[currencyCode] || null;
  } catch (error) {
      console.error("Error fetching exchange rate:", error.message);
      return null;
  }
}
// Root Route
app.post("/get-currency", async (req, res) => {
  const { latitude, longitude , priceUSD } = req.body;

  if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
  }

  const countryCode = await getCountryFromCoords(latitude, longitude);
  if (!countryCode) return res.status(500).json({ error: "Could not determine country." });

  const currencyCode = await getCurrencyByCountry(countryCode);
  if (!currencyCode) return res.status(500).json({ error: "Could not determine currency." });

  const exchangeRate = await getExchangeRate(currencyCode);
  if (exchangeRate === null) return res.status(500).json({ error: "Could not fetch exchange rate." });
    // Convert price to local currency
    const finalPrice = (priceUSD * exchangeRate).toFixed(2);
  // Send JSON response to client
  res.json({
      countryCode,
      currency: currencyCode,
      exchangeRate: `1 USD = ${exchangeRate} ${currencyCode}`,
      finalPrice: `${finalPrice} ${currencyCode}`
  });
});


// Start the server
const port = process.env.SERVER_PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app; // Use ES Module export
