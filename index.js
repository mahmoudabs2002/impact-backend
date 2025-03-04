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
);  // Replace with your API key
const NOMINATIM_API_URL = "https://nominatim.openstreetmap.org/reverse";
// const COUNTRY_CURRENCY_API = "https://restcountries.com/v3.1/name/"; // API to fetch country details
const CURRENCY_API_URL = "https://v6.exchangerate-api.com/v6";
const CURRENCY_API_KEY = "9dc864c4df843b269f7114d9"; // Replace with your actual Exchange Rate API key

// Function to get country from latitude & longitude
async function getCountryFromCoords(lat, lng) {
  try {
      const response = await axios.get(NOMINATIM_API_URL, {
          params: {
              lat,
              lon: lng,
              format: "json",
          }
      });

      return response.data.address.country_code.toUpperCase(); // Returns country code (e.g., 'FR')
  } catch (error) {
      console.error("Error fetching country:", error.message);
      return null;
  }
}
async function getCurrencyByCountry(countryCode) {
  try {
      const response = await axios.get(`https://restcountries.com/v3.1/alpha/${countryCode}`);
      
      if (!response.data || response.data.length === 0) {
          throw new Error("No country data found.");
      }

      const countryData = response.data[0];

      if (!countryData.currencies) {
          throw new Error("No currency data available for this country.");
      }

      const currencyCode = Object.keys(countryData.currencies)[0]; // Extract currency code
      return currencyCode;
  } catch (error) {
      console.error("Error fetching currency:", error.message);
      return null;
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
