(function () {
  console.log("CXL Transcript Auto-Opener: Content script loaded");

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
