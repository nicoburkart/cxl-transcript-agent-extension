# CXL Transcript Auto-Opener

## Overview

This Chrome extension is designed for anyone who wants to easily extract and use the transcript from CXL marketing courses. When browsing lessons on [app.cxl.com](https://app.cxl.com), the extension automatically detects and fetches the associated Google Docs transcript for each lesson, then outputs the transcript in a structured JSON format in your browser's console. This makes it easy to copy, process, or analyze the course content for your own study or automation workflows.

**Key Features:**

- Automatically detects "Lesson transcript" links on CXL course pages
- Fetches the transcript directly from Google Docs using the Google Docs API
- Outputs a clean JSON object with course name, lesson name, and all transcript paragraphs
- No need to manually open or copy from Google Docs

## Setup

1. **Copy the manifest template:**

   Rename or copy `manifest.template.json` to `manifest.json` in the root of the project.

2. **Create a Google Cloud Project and OAuth Client:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or use an existing one)
   - Enable the Google Docs API
   - Go to APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Choose "Chrome App" and enter your extension's ID (from chrome://extensions, after loading unpacked)
   - Copy the generated client ID

3. **Edit `manifest.json`:**

   - Replace `YOUR_CLIENT_ID.apps.googleusercontent.com` in the `oauth2` section with your actual client ID.

4. **Load the extension in Chrome:**

   - Go to `chrome://extensions`
   - Enable Developer Mode
   - Click "Load unpacked" and select your project folder

5. **(Optional) .gitignore:**
   - Add `manifest.json` to your `.gitignore` to avoid committing your real client ID.

---

**Note:** The OAuth client ID is required for authentication, but should not be shared publicly. Each user should create their own client ID for their own use.

## Usage

1. Navigate to a lesson page on [app.cxl.com](https://app.cxl.com).
2. Open your browser's developer console (F12 or right-click > Inspect > Console).
3. When a "Lesson transcript" link is detected, the extension will fetch the transcript and print a JSON object like this:

```json
{
  "course": "CRO Agency Masterclass",
  "lesson": "Skill sets and team composition",
  "content": ["Paragraph 1...", "Paragraph 2...", "..."]
}
```

4. You can copy or process this JSON as needed for your own study, automation, or analysis.
