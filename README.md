# CXL Transcript Downloader

A Chrome extension that automatically downloads and saves CXL lesson transcripts to your Notion database.

## Features

- Automatically detects and processes transcript links on CXL course pages
- Downloads transcript content from Google Docs
- Saves transcripts to your Notion database with proper formatting
- Shows visual indicators for downloaded transcripts
- Prevents duplicate downloads
- Displays toast notifications for download status

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cxl-transcript-downloader.git
cd cxl-transcript-downloader
```

### 2. Configure Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "CXL Transcript Downloader")
4. Select the workspace where you want to store the transcripts
5. Click "Submit"
6. Copy the "Internal Integration Token" (starts with `secret_`)

### 3. Create Notion Database

1. Create a new database in Notion
2. Add the following properties:
   - `Name` (Title type)
   - `Course` (Select type)
3. Copy the database ID from the URL (the part after the workspace name and before the question mark)

### 4. Configure the Extension

1. Open `background.js`
2. Update the `NOTION_CONFIG` object with your credentials:

```javascript
const NOTION_CONFIG = {
  NOTION_API_KEY: "your-notion-api-key", // The integration token you copied
  NOTION_DATABASE_ID: "your-notion-db-id", // The database ID you copied
};
```

### 5. Set Up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Docs API
4. Go to "Credentials"
5. Create an OAuth 2.0 Client ID
6. Add `chrome-extension://<your-extension-id>` to the authorized JavaScript origins
7. Copy the client ID
8. Update the `client_id` in `manifest.json`:

```json
"oauth2": {
  "client_id": "your-client-id.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/documents.readonly"]
}
```

### 6. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the extension directory

## Usage

1. Navigate to any CXL course page
2. The extension will automatically:
   - Detect transcript links
   - Download the transcript
   - Save it to your Notion database
   - Show a green checkmark next to downloaded transcripts
   - Display a success notification

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `content.js` - Content script for page interaction
- `.gitignore` - Git ignore file (excludes sensitive information)

### Security Notes

- Keep your Notion API key and database ID secure
- Never commit sensitive credentials to version control

## Troubleshooting

### Common Issues

1. **CORS Errors**

   - Make sure the Notion API domain is in the host permissions
   - Check that your Notion integration is properly configured

2. **Authentication Errors**

   - Verify your Notion API key is correct
   - Ensure your database ID is correct
   - Check that your integration has access to the database

3. **Google Docs Access**
   - Make sure you're logged into Google
   - Verify the OAuth client ID is correct
   - Check that the extension has the correct permissions

## License

MIT License - feel free to use this project for your own purposes.
