const analyzeBtn = document.getElementById("analyzeBtn");
const resultContainer = document.getElementById("resultContainer");
const errorContainer = document.getElementById("errorContainer");
const result = document.getElementById("result");
const error = document.getElementById("error");
const loading = document.getElementById("loading");

const urlInput = document.getElementById("url");
const jobPostInput = document.getElementById("jobPost");
const platformInput = document.getElementById("platform");
const imageUpload = document.getElementById("imageUpload");

let extractedText = "";

// Function to disable specific inputs
function disableInputs(except) {
  urlInput.disabled = except !== urlInput;
  jobPostInput.disabled = except !== jobPostInput;
  imageUpload.disabled = except !== imageUpload;
}

// Event Listeners to disable others on focus/click
urlInput.addEventListener("focus", () => disableInputs(urlInput));
jobPostInput.addEventListener("focus", () => disableInputs(jobPostInput));
imageUpload.addEventListener("click", () => disableInputs(imageUpload));

// Re-enable all inputs if clicked outside the main input areas
document.addEventListener("click", (e) => {
  if (![urlInput, jobPostInput, imageUpload].includes(e.target)) {
    urlInput.disabled = false;
    jobPostInput.disabled = false;
    imageUpload.disabled = false;
  }
});

// OCR from image using OCR.space API
imageUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  disableInputs(imageUpload);
  loading.classList.remove("hidden");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("apikey", "K81496851688957"); // Replace with your API key
  formData.append("language", "eng");

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage || "OCR failed");
    }

    const text = data.ParsedResults?.[0]?.ParsedText || "";
    jobPostInput.value = text;
    extractedText = text;
  } catch (err) {
    error.textContent = "Failed to extract text from image.";
    errorContainer.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
});

// Analyze button click
analyzeBtn.addEventListener("click", async () => {
  resultContainer.classList.add("hidden");
  errorContainer.classList.add("hidden");
  loading.classList.remove("hidden");

  const payload = {
    url: urlInput.value || null,
    job_post: jobPostInput.value || extractedText || null,
    platform: platformInput.value || null
  };

  try {
    const response = await fetch("http://127.0.0.1:5000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unknown error");

    result.textContent = JSON.stringify(data, null, 2);
    resultContainer.classList.remove("hidden");
  } catch (err) {
    error.textContent = err.message;
    errorContainer.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
});
