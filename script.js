const analyzeBtn = document.getElementById("analyzeBtn");
const resultContainer = document.getElementById("resultContainer");
const errorContainer = document.getElementById("errorContainer");
const result = document.getElementById("result");
const error = document.getElementById("error");
const loading = document.getElementById("loading");
const urlInput = document.getElementById("url");

// Convert radio button values to boolean
const getBooleanValue = (value) => value === 'yes';

// Get current tab URL when extension opens
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if we're running as a browser extension
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs?.[0]?.url) {
        urlInput.value = tabs[0].url;
      }
    }
  } catch (err) {
    console.error("Error getting current tab URL:", err);
  }
});


analyzeBtn.addEventListener("click", async () => {
  resultContainer.classList.add("hidden");
  errorContainer.classList.add("hidden");
  loading.classList.remove("hidden");

  const payload = {
    url: urlInput.value || null,
    has_logo: document.querySelector('input[name="hasLogo"]:checked')?.value === "yes",
    has_question: document.querySelector('input[name="hasQuestion"]:checked')?.value === "yes"
  };

  try {
    const response = await fetch("http://127.0.0.1:5000/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    result.innerHTML = data.fraudulent === "Yes"
  ? `<span style="color: red; font-weight: bold;">🚨 Job post is <u>FRAUD</u></span>`
  : `<span style="color: green; font-weight: bold;">✅ Job post is <u>NOT FRAUD</u></span>`;


    resultContainer.classList.remove("hidden");
  } catch (err) {
    error.textContent = err.message || "Failed to analyze job post";
    errorContainer.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
});

function updateResultBadges(data) {
  const badgesContainer = document.getElementById("resultBadges");
  badgesContainer.innerHTML = '';
  
  if (data.isFraudulent) {
    badgesContainer.innerHTML += `<span class="badge danger">Potential Fraud (${data.confidence})</span>`;
  } else {
    badgesContainer.innerHTML += `<span class="badge success">Likely Legitimate</span>`;
  }

  if (data.redFlags?.length > 0) {
    badgesContainer.innerHTML += `<span class="badge warning">${data.redFlags.length} Red Flags</span>`;
  }
}

function showError(message) {
  error.textContent = message;
  errorContainer.classList.remove("hidden");
  loading.classList.add("hidden");
}