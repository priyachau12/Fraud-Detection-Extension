document.addEventListener('DOMContentLoaded', function() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panels
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));
      
      // Add active class to clicked button and corresponding panel
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Analyze button
  const analyzeButton = document.getElementById('analyze-button');
  analyzeButton.addEventListener('click', () => {
    const jobUrl = document.getElementById('job-url').value.trim();
    const jobContent = document.getElementById('job-content').value.trim();
    
    if (!jobUrl && !jobContent) {
      alert('Please enter a job URL or paste job content');
      return;
    }
    
    // Show loading state
    analyzeButton.textContent = 'Analyzing...';
    analyzeButton.disabled = true;
    
    chrome.runtime.sendMessage({
      action: 'analyzeJobPost',
      data: {
        url: jobUrl || 'manual-entry',
        content: jobContent || jobUrl // Use URL as content if no content provided
      }
    }, handleAnalysisResult);
  });
  
  // Scan current page button
  const scanPageButton = document.getElementById('scan-page-button');
  scanPageButton.addEventListener('click', () => {
    scanPageButton.textContent = 'Scanning...';
    scanPageButton.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      // First extract job data from the current page
      chrome.tabs.sendMessage(activeTab.id, { action: 'scanCurrentPage' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          showError('Could not scan the current page. Make sure you are on a job posting.');
          resetScanButton();
          return;
        }
        
        // Then analyze the extracted data
        chrome.runtime.sendMessage({
          action: 'analyzeJobPost',
          data: {
            url: activeTab.url,
            content: response.data.content
          }
        }, (analysisResult) => {
          handleAnalysisResult(analysisResult);
          resetScanButton();
        });
      });
    });
  });
  
  function resetScanButton() {
    scanPageButton.textContent = 'Scan Current Page';
    scanPageButton.disabled = false;
  }
  
  // Handle analysis results
  function handleAnalysisResult(result) {
    // Reset buttons
    analyzeButton.textContent = 'Analyze Job';
    analyzeButton.disabled = false;
    
    if (!result) {
      showError('Analysis failed. Please try again.');
      return;
    }
    
    // Update the UI with results
    document.getElementById('risk-score').textContent = result.riskScore;
    document.getElementById('risk-meter-fill').style.width = `${result.riskScore}%`;
    
    // Set risk level badge
    const riskBadge = document.getElementById('risk-level-badge');
    riskBadge.textContent = result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1) + ' Risk';
    riskBadge.className = 'risk-badge ' + result.riskLevel;
    
    // Update red flags list
    const redFlagsList = document.getElementById('red-flags-list');
    redFlagsList.innerHTML = '';
    
    if (result.redFlags.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No red flags detected';
      redFlagsList.appendChild(li);
    } else {
      result.redFlags.forEach(flag => {
        const li = document.createElement('li');
        li.textContent = flag;
        redFlagsList.appendChild(li);
      });
    }
    
    // Update recommendations list
    const recommendationsList = document.getElementById('recommendations-list');
    recommendationsList.innerHTML = '';
    
    result.recommendations.forEach(recommendation => {
      const li = document.createElement('li');
      li.textContent = recommendation;
      recommendationsList.appendChild(li);
    });
    
    // Set timestamp
    document.getElementById('timestamp').textContent = new Date().toLocaleString();
    
    // Show results section
    document.getElementById('results-section').classList.remove('hidden');
  }
  
  function showError(message) {
    alert(message);
  }
  
  // Load history tab data
  function loadHistoryData() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (!response) return;
      
      // Update stats
      document.getElementById('scams-detected').textContent = response.totalScamsDetected;
      document.getElementById('jobs-scanned').textContent = response.recentScans.length;
      
      // Update history list
      const historyList = document.getElementById('history-list');
      historyList.innerHTML = '';
      
      if (response.recentScans.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No scan history yet</div>';
        return;
      }
      
      response.recentScans.forEach(scan => {
        const item = document.createElement('div');
        item.className = `history-item ${scan.riskLevel}`;
        
        const date = new Date(scan.timestamp);
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        item.innerHTML = `
          <div class="history-risk-badge ${scan.riskLevel}">${scan.riskScore}%</div>
          <div class="history-details">
            <div class="history-url" title="${scan.url}">${truncateUrl(scan.url)}</div>
            <div class="history-date">${formattedDate}</div>
          </div>
        `;
        
        historyList.appendChild(item);
      });
    });
  }
  
  function truncateUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname.substring(0, 20) + (urlObj.pathname.length > 20 ? '...' : '');
    } catch (e) {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
  }
  
  // Load settings
  function loadSettings() {
    chrome.storage.local.get(['settings'], (data) => {
      if (!data.settings) return;
      
      document.getElementById('auto-scan').checked = data.settings.autoScan;
      document.getElementById('show-notifications').checked = data.settings.notifyOnDetection;
      document.getElementById('scan-level').value = data.settings.scanLevel;
    });
  }
  
  // Save settings
  document.getElementById('save-settings').addEventListener('click', () => {
    const settings = {
      autoScan: document.getElementById('auto-scan').checked,
      notifyOnDetection: document.getElementById('show-notifications').checked,
      scanLevel: document.getElementById('scan-level').value
    };
    
    chrome.storage.local.set({ settings }, () => {
      const saveButton = document.getElementById('save-settings');
      const originalText = saveButton.textContent;
      
      saveButton.textContent = 'Saved!';
      setTimeout(() => {
        saveButton.textContent = originalText;
      }, 1500);
    });
  });
  
  // Load initial data
  loadHistoryData();
  loadSettings();
  
  // Add event listener for tab changes to refresh data
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      if (tabId === 'history') {
        loadHistoryData();
      } else if (tabId === 'settings') {
        loadSettings();
      }
    });
  });
});