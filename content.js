// const fakeKeywords = ["pay upfront", "training fee", "easy money", "wire transfer"];
// const jobPosts = document.querySelectorAll(".job-listing");

// jobPosts.forEach(post => {
//     let text = post.innerText.toLowerCase();
//     fakeKeywords.forEach(keyword => {
//         if (text.includes(keyword)) {
//             post.style.border = "2px solid red";
//             post.insertAdjacentHTML("beforeend", "<p style='color: red;'>⚠️ Fake Job Warning</p>");
//         }
//     });
// });
// Job post content extraction logic
(() => {
  // Keep track of already scanned posts to avoid duplicates
  let scannedPosts = new Set();
  
  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "scanCurrentPage") {
      const jobData = extractJobData();
      sendResponse({ success: true, data: jobData });
    }
  });
  
  // Automatically scan the page when it loads if auto-scan is enabled
  chrome.storage.local.get(["settings"], (data) => {
    if (data.settings && data.settings.autoScan) {
      setTimeout(autoScanPage, 2000); // Wait for page to fully load
    }
  });
  
  // Extract job posting data from common job sites
  function extractJobData() {
    let jobTitle = "";
    let jobDescription = "";
    let companyName = "";
    let url = window.location.href;
    
    // LinkedIn extraction
    if (window.location.hostname.includes("linkedin.com")) {
      jobTitle = document.querySelector(".job-details-jobs-unified-top-card__job-title")?.textContent?.trim() || "";
      companyName = document.querySelector(".job-details-jobs-unified-top-card__company-name")?.textContent?.trim() || "";
      jobDescription = document.querySelector(".jobs-description__content")?.textContent?.trim() || "";
    }
    // Indeed extraction
    else if (window.location.hostname.includes("indeed.com")) {
      jobTitle = document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim() || "";
      companyName = document.querySelector(".jobsearch-InlineCompanyRating-companyName")?.textContent?.trim() || "";
      jobDescription = document.querySelector("#jobDescriptionText")?.textContent?.trim() || "";
    }
    // Monster extraction
    else if (window.location.hostname.includes("monster.com")) {
      jobTitle = document.querySelector(".job-title")?.textContent?.trim() || "";
      companyName = document.querySelector(".company-name")?.textContent?.trim() || "";
      jobDescription = document.querySelector(".job-description")?.textContent?.trim() || "";
    }
    // Glassdoor extraction
    else if (window.location.hostname.includes("glassdoor.com")) {
      jobTitle = document.querySelector(".jobTitle")?.textContent?.trim() || "";
      companyName = document.querySelector(".employerName")?.textContent?.trim() || "";
      jobDescription = document.querySelector(".jobDescriptionContent")?.textContent?.trim() || "";
    }
    // Generic extraction for other sites
    else {
      // Try common selectors for job titles
      const titleSelectors = ["h1", ".job-title", ".posting-title", "title"];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobTitle = element.textContent.trim();
          break;
        }
      }
      
      // Try to find company name
      const companySelectors = [".company", ".company-name", ".organization"];
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          companyName = element.textContent.trim();
          break;
        }
      }
      
      // Get main content area for job description
      const contentSelectors = ["main", ".job-description", ".description", "article"];
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          jobDescription = element.textContent.trim();
          break;
        }
      }
    }
    
    // Fallback to getting all text if specific selectors failed
    if (!jobDescription) {
      jobDescription = document.body.textContent.trim();
    }
    
    return {
      title: jobTitle,
      company: companyName,
      description: jobDescription,
      url: url,
      content: `${jobTitle} ${companyName} ${jobDescription}` // Combined content for analysis
    };
  }
  
  // Auto-scan the current page if it's a job posting
  function autoScanPage() {
    const url = window.location.href;
    
    // Skip if we've already scanned this URL
    if (scannedPosts.has(url)) return;
    
    // Check if current page is likely a job posting
    const isJobPage = 
      url.includes("/job/") || 
      url.includes("/jobs/") || 
      url.includes("career") || 
      url.includes("posting") ||
      document.title.toLowerCase().includes("job");
    
    if (isJobPage) {
      const jobData = extractJobData();
      
      // Only proceed if we have some content to analyze
      if (jobData.content.length > 100) {
        scannedPosts.add(url);
        
        // Send data for analysis
        chrome.runtime.sendMessage({
          action: "analyzeJobPost",
          data: {
            url: jobData.url,
            content: jobData.content
          }
        }, (response) => {
          if (response && response.riskLevel === "high") {
            // Show warning for high-risk posts
            showWarningBanner(response);
          }
        });
      }
    }
  }
  
  // Display a warning banner for high-risk job posts
  function showWarningBanner(analysisResult) {
    chrome.storage.local.get(["settings"], (data) => {
      if (data.settings && data.settings.notifyOnDetection) {
        // Create banner element
        const banner = document.createElement("div");
        banner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background-color: #ff5252;
          color: white;
          padding: 12px;
          text-align: center;
          z-index: 9999;
          font-family: Arial, sans-serif;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        banner.innerHTML = `
          <b>⚠️ Warning: This job posting shows signs of being fraudulent (Risk Score: ${analysisResult.riskScore}%)</b>
          <p>${analysisResult.redFlags.join(", ")}</p>
          <button id="jpa-dismiss" style="background: white; color: #ff5252; border: none; padding: 5px 10px; margin-left: 10px; cursor: pointer; border-radius: 4px;">Dismiss</button>
          <button id="jpa-details" style="background: #d32f2f; color: white; border: none; padding: 5px 10px; margin-left: 10px; cursor: pointer; border-radius: 4px;">View Details</button>
        `;
        
        document.body.appendChild(banner);
        
        // Add event listeners
        document.getElementById("jpa-dismiss").addEventListener("click", () => {
          banner.remove();
        });
        
        document.getElementById("jpa-details").addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "openPopup" });
        });
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
          if (document.body.contains(banner)) {
            banner.remove();
          }
        }, 15000);
      }
    });
  }
})();