// Update Newly Added Events count in homepage CTA
(function updateNewEventsCount() {
  try {
    fetch('/data/manifest.json')
      .then(r => r.json())
      .then(manifest => fetch(manifest.new_events))
      .then(r => r.json())
      .then(data => {
        const countEl = document.getElementById('new-events-count');
        const wrapperEl = document.getElementById('new-events-count-wrapper');
        if (countEl && typeof data.total_new_events === 'number') {
          countEl.textContent = String(data.total_new_events);
          if (wrapperEl && Number(data.total_new_events) === 0) {
            wrapperEl.style.display = 'none';
          }
        }
      })
      .catch(() => {});
  } catch (_) {}
})();

// Tabs logic for tiles
function initTilesTabs() {
  const disciplineTab = document.getElementById('discipline-tiles-tab');
  const regionTab = document.getElementById('region-tiles-tab');
  const disciplinePanel = document.getElementById('discipline-tiles-panel');
  const regionPanel = document.getElementById('region-tiles-panel');
  if (!disciplineTab || !regionTab || !disciplinePanel || !regionPanel) return;

  function setUrl(tab) {
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab === 'discipline' ? 'disciplines' : 'regions');
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    } catch (_) {}
  }

  function activate(tab) {
    const isDiscipline = tab === 'discipline';
    disciplineTab.classList.toggle('active', isDiscipline);
    regionTab.classList.toggle('active', !isDiscipline);
    disciplineTab.setAttribute('aria-selected', String(isDiscipline));
    regionTab.setAttribute('aria-selected', String(!isDiscipline));
    disciplinePanel.classList.toggle('hidden', !isDiscipline);
    regionPanel.classList.toggle('hidden', isDiscipline);
    setUrl(tab);
  }

  disciplineTab.addEventListener('click', (e) => {
    e.preventDefault();
    activate('discipline');
  });
  regionTab.addEventListener('click', (e) => {
    e.preventDefault();
    activate('region');
  });

  // Initialize from URL (?tab=regions|disciplines) or last region selection in localStorage
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = (params.get('tab') || '').toLowerCase();
    if (tabParam === 'regions' || tabParam === 'disciplines') {
      activate(tabParam === 'regions' ? 'region' : 'discipline');
    } else {
      // No tab param: infer from saved regions
      let savedRegions = [];
      try {
        const raw = localStorage.getItem('selectedRegions');
        savedRegions = raw ? JSON.parse(raw) : [];
      } catch (_) { savedRegions = []; }
      if (Array.isArray(savedRegions) && savedRegions.length > 0) {
        activate('region');
      } else {
        activate('discipline');
      }
    }
  } catch (_) {
    activate('discipline');
  }
}
/**
 * Homepage Module - New Structure
 * 
 * Handles:
 * - Loading discipline tile event counts
 * - Loading region statistics
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


// Load discipline event counts from homepage stats
async function loadDisciplineCounts() {
  try {
    recordMilestone('discipline_counts_start');
    
    // Load manifest to get latest homepage stats file
    const manifestResponse = await fetch('/data/manifest.json');
    const manifest = await manifestResponse.json();
    
    // Load homepage stats file
    const statsUrl = manifest.homepage?.stats || '/data/homepage-stats.v20250107.json';
    const response = await fetch(statsUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch homepage stats: ${response.status}`);
    }
    
    const stats = await response.json();
    
    // Update the UI with the counts from stats
    Object.keys(stats.disciplines).forEach(discipline => {
      const disciplineData = stats.disciplines[discipline];
      const element = document.querySelector(`[href="/pages/${discipline}/"] .tile-number`);
      if (element) {
        element.textContent = disciplineData.count;
      }
    });
    
    recordMilestone('discipline_counts_loaded');
    console.log('✅ Homepage stats loaded:', stats);
    
  } catch (error) {
    console.error('❌ Failed to load homepage stats:', error);
    
    // Show error state - keep placeholder numbers
    console.log('⚠️ Using placeholder numbers due to load error');
  }
}

// Load region statistics
async function loadRegionStats() {
  try {
    recordMilestone('region_stats_start');
      
      // Load manifest to get latest file versions
      const manifestResponse = await fetch('/data/manifest.json');
      const manifest = await manifestResponse.json();
      const facetsUrl = manifest.index.facets;
    
    const response = await fetch(facetsUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch facets: ${response.status}`);
    }
    
    const facets = await response.json();
    
    // Create stats grid
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    if (!facets.regions || !Array.isArray(facets.regions)) {
      statsGrid.innerHTML = '<div class="no-stats">No region data available</div>';
      return;
    }
    
    // Filter regions that have totals and create stat cards
    const regionStats = facets.regions
      .filter(region => region.total && region.total > 0)
      .map(region => ({
        name: region.name,
        count: region.total
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
    
    if (regionStats.length === 0) {
      statsGrid.innerHTML = '<div class="no-stats">No region statistics available</div>';
      return;
    }
    
    const statsHtml = regionStats.map(stat => `
      <div class="stat-card">
        <h3>${stat.name}</h3>
        <div class="count">${stat.count}</div>
      </div>
    `).join('');
    
    statsGrid.innerHTML = statsHtml;
    
    recordMilestone('region_stats_loaded');
    console.log('✅ Region stats loaded:', regionStats.length, 'regions');
    
  } catch (error) {
    console.error('❌ Failed to load region stats:', error);
    
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid) {
      statsGrid.innerHTML = '<div class="error-message">Failed to load statistics</div>';
    }
  }
}

// Main initialization function
function initHomepage() {
  console.log('🚀 Homepage module initializing...');
  recordMilestone('initialization_start');
  // Ensure region tile links have properly encoded region parameters
  try {
    const regionLinks = document.querySelectorAll('.region-tiles-grid a');
    regionLinks.forEach(link => {
      const titleEl = link.querySelector('h3');
      if (!titleEl) return;
      const regionName = titleEl.textContent.trim();
      const url = new URL('/pages/road/', window.location.origin);
      url.searchParams.set('region', regionName);
      // Assign encoded href relative to site root
      link.setAttribute('href', url.pathname + '?' + url.searchParams.toString());
    });
  } catch (_) {}
  
  // Load discipline counts and region stats in parallel
  Promise.all([
    loadDisciplineCounts(),
    loadRegionStats()
  ]).then(() => {
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
  document.addEventListener('DOMContentLoaded', () => { initHomepage(); initTilesTabs(); });
} else {
  initHomepage();
  initTilesTabs();
}