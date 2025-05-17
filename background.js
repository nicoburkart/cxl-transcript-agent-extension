// Background script for CXL Transcript Auto-Opener
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
      .then((content) => {
        console.log(
          "Background script: Successfully fetched and processed content"
        );
        sendResponse({ success: true, content });
      })
      .catch((error) => {
        console.error("Background script: Error fetching transcript:", error);
        sendResponse({ success: false, error: error.message });
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
