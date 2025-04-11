// const form = document.getElementById('jobForm');
// const extractingText = document.getElementById('extractingText');
// const platformInput = document.getElementById('platformInput');

// document.getElementById('imageUpload').addEventListener('change', async (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   extractingText.style.display = 'block';

//   try {
//     const { data: { text } } = await Tesseract.recognize(file, 'eng', {
//       logger: m => console.log(m)
//     });

//     document.getElementById('jobPost').value = text;
//     platformInput.style.display = 'block';
//   } catch (error) {
//     alert('Failed to extract text from image.');
//     console.error(error);
//   } finally {
//     extractingText.style.display = 'none';
//   }
// });

// document.getElementById('jobPost').addEventListener('click', () => {
//   platformInput.style.display = 'block';
// });

// form.addEventListener('submit', async (e) => {
//   e.preventDefault();

//   const url = document.getElementById('url').value;
//   const jobPost = document.getElementById('jobPost').value;
//   const platform = document.getElementById('platform').value;

//   try {
//     const response = await fetch('http://127.0.0.1:5000/api/analyze', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ url, job_post: jobPost, platform })
//     });

//     const result = await response.json();
//     alert('Response received. Check console for details.');
//     console.log(result);
//   } catch (err) {
//     alert('Error submitting job post for analysis.');
//     console.error(err);
//   }
// });




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

imageUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  loading.classList.remove("hidden");
  try {
    const { data: { text } } = await Tesseract.recognize(file, 'eng');
    jobPostInput.value = text;
    extractedText = text;
  } catch (err) {
    error.textContent = "Failed to extract text from image.";
    errorContainer.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
});

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
