// Background script for CXL Transcript Auto-Opener

// Notion API Configuration
const NOTION_CONFIG = {
  NOTION_API_KEY: "your-notion-api-key",
  NOTION_DATABASE_ID: "your-notin-db-id",
};

chrome.runtime.onInstalled.addListener(() => {
  console.log("CXL Transcript Auto-Opener installed");
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchTranscript") {
    console.log(
      "Background script: Received fetch request for URL:",
      request.url
    );
    fetchTranscriptContent(request.url)
      .then(async (content) => {
        console.log(
          "Background script: Successfully fetched and processed content"
        );
        try {
          const result = await sendToNotion(content);
          // Send status message to content script
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "notionStatus",
            status: result.status === "skipped" ? "skipped" : "success",
            message:
              result.status === "skipped"
                ? "Transcript already exists in Notion"
                : "Transcript saved to Notion",
          });
          sendResponse({ success: true, content });
        } catch (error) {
          console.error("Background script: Error sending to Notion:", error);
          // Send error message to content script
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "notionStatus",
            status: "error",
            message: "Failed to save transcript to Notion",
          });
          sendResponse({ success: false, error: error.message });
        }
      })
      .catch((error) => {
        console.error("Background script: Error fetching transcript:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  } else if (request.action === "checkTranscriptSaved") {
    // Extract document ID from URL
    const docId = getDocIdFromUrl(request.url);
    if (!docId) {
      sendResponse({ saved: false });
      return;
    }

    // Fetch document content to get title
    fetchTranscriptContent(request.url)
      .then(async (content) => {
        try {
          // Check if transcript exists in Notion
          const exists = await checkExistingTranscript(
            content.lesson,
            content.course
          );
          sendResponse({ saved: exists });
        } catch (error) {
          console.error("Error checking transcript status:", error);
          sendResponse({ saved: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching transcript:", error);
        sendResponse({ saved: false });
      });
    return true; // Required for async sendResponse
  }
});

// Function to get Google Docs document ID from URL
function getDocIdFromUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const docId = match ? match[1] : null;
  console.log("Background script: Extracted doc ID:", docId);
  return docId;
}

// Function to fetch transcript content
async function fetchTranscriptContent(url) {
  console.log("Background script: Starting fetch process for URL:", url);
  const docId = getDocIdFromUrl(url);
  if (!docId) {
    throw new Error("Invalid Google Docs URL");
  }

  // Get OAuth token
  console.log("Background script: Requesting OAuth token...");
  const token = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      if (chrome.runtime.lastError) {
        console.error(
          "Background script: OAuth error:",
          chrome.runtime.lastError
        );
        reject(chrome.runtime.lastError);
      } else {
        console.log("Background script: Successfully obtained OAuth token");
        resolve(token);
      }
    });
  });

  // Fetch document content
  console.log("Background script: Fetching document from Google Docs API...");
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    console.error(
      "Background script: API response not OK:",
      response.status,
      response.statusText
    );
    throw new Error(
      `Failed to fetch document: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  console.log("Background script: Successfully received document data");

  // Process the document content into a more usable format
  console.log("Background script: Processing document content...");
  const processedContent = processDocumentContent(data);
  console.log("Background script: Content processing complete");
  return processedContent;
}

// Function to process document content into a structured format
function processDocumentContent(doc) {
  console.log("Background script: Starting content processing");

  // Extract course and lesson from the title
  let course = "";
  let lesson = "";
  let title = doc.title || "";
  const match = title.match(/^Transcript - (.*?) - (.*)$/);
  if (match) {
    course = match[1].trim();
    lesson = match[2].trim();
  } else {
    course = title;
    lesson = "";
  }

  // Gather all paragraphs
  let allParagraphs = [];
  doc.body.content.forEach((element) => {
    if (element.paragraph) {
      const text = element.paragraph.elements
        .map((elem) => elem.textRun?.content || "")
        .join("")
        .trim();
      if (text) {
        allParagraphs.push(text);
      }
    }
  });

  const result = {
    course,
    lesson,
    content: allParagraphs,
  };

  console.log("Background script: Processed content structure:", result);
  return result;
}

// Function to check if a transcript already exists in Notion
async function checkExistingTranscript(lesson, course) {
  console.log("Background script: Checking for existing transcript...");

  const response = await fetch(
    `https://api.notion.com/v1/databases/${NOTION_CONFIG.NOTION_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_CONFIG.NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: "Name",
              title: {
                equals: lesson,
              },
            },
            {
              property: "Course",
              select: {
                equals: course,
              },
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error(
      "Background script: Error checking existing transcript:",
      errorData
    );
    throw new Error(
      `Failed to check existing transcript: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.results.length > 0;
}

// Function to send content to Notion
async function sendToNotion(content) {
  console.log("Background script: Sending content to Notion...");

  if (!NOTION_CONFIG.NOTION_API_KEY || !NOTION_CONFIG.NOTION_DATABASE_ID) {
    throw new Error(
      "Notion credentials not configured. Please check the NOTION_CONFIG object in background.js"
    );
  }

  // Check if transcript already exists
  const exists = await checkExistingTranscript(content.lesson, content.course);
  if (exists) {
    console.log(
      "Background script: Transcript already exists in Notion, skipping..."
    );
    return { status: "skipped", reason: "Transcript already exists" };
  }

  const requestBody = {
    parent: { database_id: NOTION_CONFIG.NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: content.lesson || "Untitled",
            },
          },
        ],
      },
      Course: {
        select: {
          name: content.course || "Uncategorized",
        },
      },
    },
    children: content.content.map((paragraph) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: paragraph,
            },
          },
        ],
      },
    })),
  };

  console.log(
    "Background script: Sending request to Notion:",
    JSON.stringify(requestBody, null, 2)
  );

  const response = await fetch(`https://api.notion.com/v1/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_CONFIG.NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error("Background script: Notion API error details:", errorData);
    throw new Error(
      `Failed to send to Notion: ${response.status} ${response.statusText}${
        errorData ? ` - ${JSON.stringify(errorData)}` : ""
      }`
    );
  }

  console.log("Background script: Successfully sent content to Notion");
  return await response.json();
}
