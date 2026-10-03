// Build Configuration for Different Clients
// This file helps you build the app with different API base URLs

const configs = {
  // Karbar Admin (Default)
  karbar: {
    API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:8000',
    COMPANY_NAME: 'Karbar Ecommerce',
    APP_NAME: 'Karbar POS'
  },
  
  // Megastar Lakshmipur
  megastar: {
    API_BASE_URL: 'https://store.megastarlakshmipur.com',
    COMPANY_NAME: 'Megastar Lakshmipur',
    APP_NAME: 'Megastar POS'
  },
  
  // Add more clients here
  // client_name: {
  //   API_BASE_URL: 'https://your-api-url.com',
  //   COMPANY_NAME: 'Your Company Name',
  //   APP_NAME: 'Your POS Name'
  // }
};

module.exports = configs;
