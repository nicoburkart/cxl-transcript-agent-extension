(function () {
  console.log("CXL Transcript Auto-Opener: Content script loaded");

  // Function to create and show toast notification
  function showToast(message, status = "success") {
    // Find the video section
    const videoSection = document.querySelector(".nei-widget-video");
    if (!videoSection) return;

    // Create toast container if it doesn't exist
    let toastContainer = videoSection.querySelector(".cxl-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "cxl-toast-container";
      toastContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        width: 100%;
        max-width: 400px;
        text-align: center;
      `;
      videoSection.style.position = "relative";
      videoSection.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement("div");
    toast.style.cssText = `
      background-color: ${status === "success" ? "#4CAF50" : "#f44336"};
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      margin-bottom: 10px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      display: inline-block;
    `;
    toast.textContent = message;

    // Add toast to container
    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  // Function to add loading spinner to transcript link
  function addLoadingSpinner(link) {
    // Remove existing checkmark if present
    const existingCheckmark = link.querySelector(".transcript-checkmark");
    if (existingCheckmark) {
      existingCheckmark.remove();
    }

    // Create spinner element
    const spinner = document.createElement("span");
    spinner.className = "transcript-checkmark loading";
    spinner.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      width: 16px;
      height: 16px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #4CAF50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    // Add spinner styles to head
    if (!document.getElementById("transcript-spinner-styles")) {
      const style = document.createElement("style");
      style.id = "transcript-spinner-styles";
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Add spinner after the link text
    link.appendChild(spinner);
  }

  // Function to add checkmark to transcript link
  function addCheckmark(link) {
    // Remove loading spinner if present
    const existingSpinner = link.querySelector(".transcript-checkmark.loading");
    if (existingSpinner) {
      existingSpinner.remove();
    }

    // Check if checkmark already exists
    if (link.querySelector(".transcript-checkmark:not(.loading)")) {
      return;
    }

    // Create checkmark element
    const checkmark = document.createElement("span");
    checkmark.className = "transcript-checkmark";
    checkmark.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      background-color: #4CAF50;
      color: white;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 12px;
      line-height: 1;
    `;
    checkmark.innerHTML = "✓";

    // Add checkmark after the link text
    link.appendChild(checkmark);
  }

  // Function to check if transcript is saved in Notion
  async function checkTranscriptSaved(link) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "checkTranscriptSaved",
        url: link.href,
      });
      if (response.saved) {
        addCheckmark(link);
      }
    } catch (error) {
      console.error("Error checking transcript status:", error);
    }
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "notionStatus") {
      // Only show toast for successful saves
      if (request.status === "success") {
        showToast(request.message, request.status);
      }
      // Add checkmark for both success and skipped
      if (request.status === "success" || request.status === "skipped") {
        const links = document.querySelectorAll('a[href*="docs.google.com"]');
        links.forEach((link) => {
          if (link.textContent.trim().toLowerCase() === "lesson transcript") {
            addCheckmark(link);
          }
        });
      }
    }
  });

  function checkAndOpenTranscript(link) {
    if (
      link.textContent.trim().toLowerCase() === "lesson transcript" &&
      link.href.includes("docs.google.com")
    ) {
      console.log("Found transcript link:", link.href);

      // Check if it's not already opened (avoid looping or opening many times)
      const alreadyOpened = sessionStorage.getItem("transcriptOpened");
      if (!alreadyOpened || sessionStorage.getItem("lastHref") !== link.href) {
        console.log("Fetching transcript content...");

        // Add loading spinner
        addLoadingSpinner(link);

        // Check if transcript is already saved
        checkTranscriptSaved(link);

        // Fetch transcript content
        chrome.runtime.sendMessage(
          { action: "fetchTranscript", url: link.href },
          (response) => {
            if (response.success) {
              console.log("Successfully fetched transcript!");
              console.log("Course:", response.content.course);
              console.log("Lesson:", response.content.lesson);
              console.log(
                "Number of paragraphs:",
                response.content.content.length
              );
              console.log("Full transcript content:", response.content);
            } else {
              console.error("Failed to fetch transcript:", response.error);
              // Remove loading spinner on error
              const spinner = link.querySelector(
                ".transcript-checkmark.loading"
              );
              if (spinner) {
                spinner.remove();
              }
            }
          }
        );

        sessionStorage.setItem("transcriptOpened", "true");
        sessionStorage.setItem("lastHref", link.href);
      } else {
        console.log("Transcript already processed for this session");
      }
    }
  }

  // Check existing links
  console.log("Checking for existing transcript links...");
  const existingLinks = document.querySelectorAll("a");
  console.log("Found", existingLinks.length, "total links on page");
  existingLinks.forEach(checkAndOpenTranscript);

  // Watch for new links being added to the page
  console.log("Setting up observer for dynamically added links...");
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === "A") {
          console.log("New link detected:", node.href);
          checkAndOpenTranscript(node);
        } else if (node.querySelectorAll) {
          const newLinks = node.querySelectorAll("a");
          if (newLinks.length > 0) {
            console.log("Found", newLinks.length, "new links in added node");
            newLinks.forEach(checkAndOpenTranscript);
          }
        }
      });
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  console.log("Observer started - watching for new transcript links");
})();
