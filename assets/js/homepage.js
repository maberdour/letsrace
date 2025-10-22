// Update Newly Added Events count in homepage CTA
let newEventsCountUpdated = false;
function updateNewEventsCount() {
  if (newEventsCountUpdated) {
    console.log('⚠️ New events count already updated, skipping...');
    return;
  }
  
  console.log('🔄 Updating new events count...');
  newEventsCountUpdated = true;
  
  try {
    fetch('/data/manifest.json')
      .then(r => r.json())
      .then(manifest => {
        console.log('📋 Manifest loaded:', manifest);
        return fetch(manifest.new_events);
      })
      .then(r => r.json())
      .then(data => {
        console.log('📊 New events data:', data);
        console.log('📅 Cutoff date:', data.cutoff_date);
        console.log('📅 Last build:', data.last_build);
        console.log('📅 Current date:', new Date().toISOString());
        
        // Check if events are actually "new" based on current date
        const cutoffDate = new Date(data.cutoff_date);
        const currentDate = new Date();
        const daysSinceCutoff = Math.floor((currentDate - cutoffDate) / (1000 * 60 * 60 * 24));
        console.log('📊 Days since cutoff:', daysSinceCutoff);
        
        const countEl = document.getElementById('new-events-count');
        const wrapperEl = document.getElementById('new-events-count-wrapper');
        console.log('🎯 DOM elements:', { countEl, wrapperEl });
        if (countEl && typeof data.total_new_events === 'number') {
          console.log('✅ Setting count to:', data.total_new_events);
          countEl.textContent = String(data.total_new_events);
          if (wrapperEl && Number(data.total_new_events) === 0) {
            wrapperEl.style.display = 'none';
          }
        } else {
          console.log('❌ Failed to update count:', { countEl: !!countEl, total_new_events: data.total_new_events });
        }
      })
      .catch(error => {
        console.error('❌ Error updating new events count:', error);
        newEventsCountUpdated = false; // Reset flag on error
      });
  } catch (error) {
    console.error('❌ Error in updateNewEventsCount:', error);
    newEventsCountUpdated = false; // Reset flag on error
  }
}

// Initialize discipline tiles - no tabs needed
function initDisciplineTiles() {
  const disciplinePanel = document.getElementById('discipline-tiles-panel');
  if (!disciplinePanel) return;

  // Ensure discipline panel is visible
  disciplinePanel.classList.remove('hidden');
}

// Initialize region filters for homepage
async function initHomepageRegionFilters() {
  const regionCheckboxes = document.getElementById('region-checkboxes');
  const selectAllRegionsButton = document.getElementById('select-all-regions');
  const clearRegionsButton = document.getElementById('clear-regions');
  
  if (!regionCheckboxes || !clearRegionsButton) {
    console.error('Missing region filter elements');
    return;
  }

  let facets = null;

  try {
    console.log('🔄 Loading regions for homepage...');
    
    // Load manifest to get facets URL
    const manifestResponse = await fetch('/data/manifest.json');
    const manifest = await manifestResponse.json();
    const facetsUrl = manifest.index.facets;
    
    // Fetch facets data
    const facetsResponse = await fetch(facetsUrl);
    if (!facetsResponse.ok) {
      throw new Error(`Failed to fetch facets: ${facetsResponse.status}`);
    }
    
    facets = await facetsResponse.json();
    
    if (!facets || !Array.isArray(facets.regions)) {
      throw new Error('Invalid facets data structure');
    }
    
    console.log('✅ Regions loaded:', facets.regions.length);
    
    // Load saved regions from localStorage
    let savedRegions = [];
    try {
      const saved = localStorage.getItem('selectedRegions');
      savedRegions = saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading saved regions:', error);
    }
    
    // Populate region checkboxes
    regionCheckboxes.innerHTML = facets.regions.map(region => `
      <label class="region-checkbox">
        <input type="checkbox" value="${region}"${savedRegions.includes(region) ? ' checked' : ''}>
        <span class="checkmark"></span>
        ${region}
      </label>
    `).join('');
    
    // Function to update discipline counts based on selected regions
    function updateDisciplineCounts(selectedRegions) {
      const disciplineElements = {
        'road': document.querySelector('[href="/pages/road/"] .tile-number'),
        'track': document.querySelector('[href="/pages/track/"] .tile-number'),
        'bmx': document.querySelector('[href="/pages/bmx/"] .tile-number'),
        'mtb': document.querySelector('[href="/pages/mtb/"] .tile-number'),
        'cyclo-cross': document.querySelector('[href="/pages/cyclo-cross/"] .tile-number'),
        'speedway': document.querySelector('[href="/pages/speedway/"] .tile-number'),
        'time-trial': document.querySelector('[href="/pages/time-trial/"] .tile-number'),
        'hill-climb': document.querySelector('[href="/pages/hill-climb/"] .tile-number')
      };
      
      // Discipline name mapping for the data
      const disciplineMapping = {
        'road': 'Road',
        'track': 'Track',
        'bmx': 'BMX',
        'mtb': 'MTB',
        'cyclo-cross': 'Cyclo Cross',
        'speedway': 'Speedway',
        'time-trial': 'Time Trial',
        'hill-climb': 'Hill Climb'
      };
      
      Object.keys(disciplineElements).forEach(discipline => {
        const element = disciplineElements[discipline];
        if (!element) return;
        
        let count = 0;
        
        if (selectedRegions.length === 0) {
          // No regions selected - show total counts
          const disciplineName = disciplineMapping[discipline];
          count = facets.counts[disciplineName] || 0;
        } else {
          // Calculate count for selected regions
          const disciplineName = disciplineMapping[discipline];
          selectedRegions.forEach(region => {
            const key = `${disciplineName}|${region}`;
            count += facets.counts[key] || 0;
          });
        }
        
        element.textContent = count;
      });
    }
    
    // Add event listeners
    regionCheckboxes.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const selectedRegions = Array.from(regionCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => cb.value);
        
        // Update discipline counts
        updateDisciplineCounts(selectedRegions);
        
        // Store in localStorage
        if (selectedRegions.length > 0) {
          localStorage.setItem('selectedRegions', JSON.stringify(selectedRegions));
        } else {
          localStorage.removeItem('selectedRegions');
        }
        
        console.log('🔍 Selected regions:', selectedRegions);
      }
    });
    
    // Select all regions button
    if (selectAllRegionsButton) {
      selectAllRegionsButton.addEventListener('click', () => {
        const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);
        
        const selectedRegions = Array.from(checkboxes).map(cb => cb.value);
        updateDisciplineCounts(selectedRegions);
        
        // Store in localStorage
        localStorage.setItem('selectedRegions', JSON.stringify(selectedRegions));
        
        console.log('✅ Selected all regions');
      });
    }
    
    clearRegionsButton.addEventListener('click', () => {
      const checkboxes = regionCheckboxes.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      localStorage.removeItem('selectedRegions');
      
      // Update counts to show totals
      updateDisciplineCounts([]);
      
      console.log('🧹 Cleared all regions');
    });
    
    // Filter toggle functionality
    const filterToggle = document.getElementById('filter-toggle');
    const filterContent = document.getElementById('filter-content');
    
    if (filterToggle && filterContent) {
      filterToggle.addEventListener('click', () => {
        filterToggle.classList.toggle('expanded');
        filterContent.classList.toggle('expanded');
      });
    }
    
    // Initialize with saved regions or show totals
    const initialSelectedRegions = savedRegions.length > 0 ? savedRegions : [];
    updateDisciplineCounts(initialSelectedRegions);
    
  } catch (error) {
    console.error('❌ Failed to load regions:', error);
    regionCheckboxes.innerHTML = '<div class="error-message">Failed to load regions</div>';
  }
}
/**
 * Homepage Module - New Structure
 * 
 * Handles:
 * - Loading discipline tile event counts
 * - Performance monitoring
 * - Analytics tracking
 */

// Performance monitoring
const performanceMetrics = {
  startTime: performance.now(),
  milestones: {}
};

function recordMilestone(name) {
  performanceMetrics.milestones[name] = performance.now() - performanceMetrics.startTime;
  console.log(`⏱️ ${name}: ${performanceMetrics.milestones[name].toFixed(2)}ms`);
}

function logPerformanceSummary() {
  const totalTime = performance.now() - performanceMetrics.startTime;
  console.log('📊 Performance Summary:', {
    totalLoadTime: `${totalTime.toFixed(2)}ms`,
    milestones: performanceMetrics.milestones
  });
  
  // Log to analytics if available
  if (window.gtag) {
    window.gtag('event', 'page_performance', {
      load_time: Math.round(totalTime),
      milestones: performanceMetrics.milestones
    });
  }
}

// Track analytics
function trackAnalytics(action, data = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      event_category: 'homepage',
      ...data
    });
  }
}


// Load discipline event counts from homepage stats (now handled by region filters)
async function loadDisciplineCounts() {
  // This function is now handled by initHomepageRegionFilters()
  // which loads counts from facets data and updates based on region selection
  console.log('📊 Discipline counts now handled by region filters');
}


// Main initialization function
function initHomepage() {
  console.log('🚀 Homepage module initializing...');
  recordMilestone('initialization_start');
  
  // Update new events count
  updateNewEventsCount();
  
  // Load discipline counts
  loadDisciplineCounts().then(() => {
    recordMilestone('page_fully_loaded');
    logPerformanceSummary();
    console.log('✅ Homepage fully loaded');
  }).catch(error => {
    console.error('❌ Homepage initialization failed:', error);
    
    // Track error for analytics
    if (window.gtag) {
      window.gtag('event', 'page_error', {
        error_type: 'initialization_failed',
        error_message: error.message
      });
    }
  });
  
  // Track tile clicks
  document.addEventListener('click', (e) => {
    if (e.target.closest('.discipline-tile')) {
      const tile = e.target.closest('.discipline-tile');
      const discipline = tile.href.split('/').pop().replace('-', '_');
      trackAnalytics('discipline_tile_click', {
        discipline: discipline
      });
    }
  });
  
  // Track chip navigation clicks
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) {
      const chipText = e.target.textContent.trim();
      trackAnalytics('chip_nav_click', {
        chip: chipText
      });
    }
  });
}

// Auto-initialize if module is loaded directly
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { 
    initHomepage(); 
    initDisciplineTiles(); 
    initHomepageRegionFilters();
  });
} else {
  initHomepage();
  initDisciplineTiles();
  initHomepageRegionFilters();
}