# Building for Different Clients

This guide explains how to build the POS application for different clients with custom API URLs.

## Quick Start

### Build for Karbar (Default)
```bash
npm run build:karbar
npm run build:installer
```

### Build for Megastar Lakshmipur
```bash
npm run build:megastar
npm run build:installer
```

### Build for Custom Client
```bash
node build-for-client.js custom https://your-api-url.com "Your Company Name"
npm run build:installer
```

## Adding New Clients

Edit `build-config.js` and add your client:

```javascript
{
  your_client: {
    API_BASE_URL: 'https://your-api.com',
    COMPANY_NAME: 'Your Company',
    APP_NAME: 'Your POS'
  }
}
```

Then build:
```bash
node build-for-client.js your_client
npm run build:installer
```

## What Gets Configured

When you build for a client, the following is set:

1. **API_BASE_URL** - The default API server URL
2. **COMPANY_NAME** - Company name for receipts
3. **APP_NAME** - Application name

## Important Notes

- The API URL can still be changed in Settings after installation
- The build configuration just sets the default values
- Each build creates a `.env` file with the client's configuration
- The installer will be created in the `dist` folder

## Build Process

1. **Configure** - Set API URL and company info
2. **Build** - Compile the application
3. **Package** - Create installer (Windows .exe, Mac .dmg, Linux .AppImage)

## Examples

### Example 1: Build for Karbar
```bash
npm run build:karbar
npm run build:installer
```
Output: `dist/Karbar POS Setup 1.0.0.exe`

### Example 2: Build for Megastar
```bash
npm run build:megastar
npm run build:installer
```
Output: `dist/Megastar POS Setup 1.0.0.exe`

### Example 3: Build for Custom Client
```bash
node build-for-client.js custom https://store.example.com "Example Store"
npm run build:installer
```
Output: `dist/Example Store POS Setup 1.0.0.exe`

## After Installation

Users can change the API URL in:
- Settings > API Settings > API Base URL
- Save and restart the app

This allows flexibility for testing or switching servers.
