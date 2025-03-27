// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    totalScamsDetected: 0,
    scanHistory: [],
    settings: {
      autoScan: true,
      notifyOnDetection: true,
      scanLevel: "standard", // standard,   aggressive, minimal
    },
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyzeJobPost") {
    analyzeJobPost(message.data, sendResponse);
    return true; // Indicates we want to use sendResponse asynchronously
  } else if (message.action === "getStats") {
    getStats(sendResponse);
    return true;
  }
});

// Simple job post analysis logic (this would be more sophisticated in a real extension)
async function analyzeJobPost(data, callback) {
  const { url, content } = data;

  // Fake detection logic - in a real implementation, this would be more sophisticated
  // and potentially use an API for ML-based detection
  const redFlags = [];
  const suspiciousPatterns = [
    {
      pattern:
        /\b(work from home|remote work)\b.*\b(guarantee|guaranteed|[$][0-9,]+\/day)\b/i,
      flag: "Unrealistic income promises",
    },
    {
      pattern:
        /\b(no experience|no skills required)\b.*\b(high salary|high pay|lucrative)\b/i,
      flag: "Too good to be true job requirements",
    },
    {
      pattern: /\b(registration fee|payment required|investment needed)\b/i,
      flag: "Requests for payment",
    },
    {
      pattern:
        /\b(banking details|credit card|ssn|social security|bank account)\b/i,
      flag: "Requests for financial information",
    },
    {
      pattern: /\b(urgent|immediate start|apply now|don't wait)\b/i,
      flag: "High-pressure tactics",
    },
    { pattern: /\b(gmail|yahoo|hotmail)\b/i, flag: "Non-corporate email" },
    {
      pattern:
        /\b(confidential|secret|not disclosed)\b.*\b(company|employer)\b/i,
      flag: "Secretive about company details",
    },
  ];

  // Check content against suspicious patterns
  for (const { pattern, flag } of suspiciousPatterns) {
    if (pattern.test(content)) {
      redFlags.push(flag);
    }
  }

  // Calculate risk score based on number of red flags (simplified)
  const riskScore = Math.min(100, redFlags.length * 20);

  // Determine risk level
  let riskLevel;
  if (riskScore >= 70) {
    riskLevel = "high";
  } else if (riskScore >= 40) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  // Save this scan to history
  const scanResult = {
    timestamp: new Date().toISOString(),
    url,
    riskScore,
    riskLevel,
    redFlags,
  };

  // Update storage with new scan
  chrome.storage.local.get(["scanHistory", "totalScamsDetected"], (data) => {
    const newHistory = [scanResult, ...(data.scanHistory || [])].slice(0, 100); // Keep last 100 scans
    let newTotal = data.totalScamsDetected || 0;

    if (riskLevel === "high") {
      newTotal++;
    }

    chrome.storage.local.set({
      scanHistory: newHistory,
      totalScamsDetected: newTotal,
    });
  });

  // Send results back to caller
  callback({
    riskScore,
    riskLevel,
    redFlags,
    recommendations: getRecommendations(riskLevel, redFlags),
  });
}

// Generate recommendations based on risk level and red flags
function getRecommendations(riskLevel, redFlags) {
  const recommendations = [];

  if (riskLevel === "high") {
    recommendations.push("Avoid engaging with this job post.");
    recommendations.push("Report this listing to the job platform.");
  } else if (riskLevel === "medium") {
    recommendations.push("Proceed with caution and do additional research.");
    recommendations.push("Do not provide personal or financial information.");
  } else {
    recommendations.push(
      "This post appears legitimate but always verify company information."
    );
  }

  // Add specific recommendations based on red flags
  if (redFlags.includes("Requests for payment")) {
    recommendations.push(
      "Legitimate employers never ask for payment to apply."
    );
  }
  if (redFlags.includes("Requests for financial information")) {
    recommendations.push(
      "Never provide banking details before formal employment begins."
    );
  }

  return recommendations;
}

// Get stats for the popup
function getStats(callback) {
  chrome.storage.local.get(
    ["totalScamsDetected", "scanHistory", "settings"],
    (data) => {
      callback({
        totalScamsDetected: data.totalScamsDetected || 0,
        recentScans: (data.scanHistory || []).slice(0, 5),
        settings: data.settings || {
          autoScan: true,
          notifyOnDetection: true,
          scanLevel: "standard",
        },
      });
    }
  );
}
