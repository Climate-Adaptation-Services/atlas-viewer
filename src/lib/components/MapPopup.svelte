<script>
  import { onMount } from "svelte";
  import { datalaag, time, scenario } from "$lib/stores.js";
  
  // Track the current map parameters to detect changes
  let currentDataLayer;
  let currentTime;
  let currentScenario;
  
  // Props
  export let map; // The Leaflet map instance
  export let L; // The Leaflet library
  export let wmsLayers; // The WMS layers
  export let getLayerId; // Function to get layer ID
  export let getLegendUnit; // Function to get legend unit
  
  let popup;
  
  onMount(() => {
    // Create a popup but don't add it to the map yet
    if (L && map) {
      setupPopup();
    }
    
    return () => {
      if (popup) {
        popup.remove();
      }
    };
  });
  
  $: if (L && map && !popup) {
    setupPopup();
  }
  
  // Close popup when any map parameters change (data layer, time period, or scenario)
  $: if (popup && ($datalaag !== currentDataLayer || $time !== currentTime || $scenario !== currentScenario)) {
    // Update current parameter trackers
    currentDataLayer = $datalaag;
    currentTime = $time;
    currentScenario = $scenario;
    // Close the popup
    popup.close();
  }
  
  function setupPopup() {
    // Create the popup
    popup = L.popup();
    
    // Add click event to show lat/lon coordinates and WMS value
    map.on('click', function(e) {
      const lat = e.latlng.lat.toFixed(6);
      const lng = e.latlng.lng.toFixed(6);
      
      // Set initial content with loading state
      popup
        .setLatLng(e.latlng)
        .setContent(`<div class="popup-content">Loading value...</div>`)
        .openOn(map);
      
      // Get the current active layer ID
      const layerId = getLayerId($datalaag, $time, $scenario);
      
      if (layerId && wmsLayers[layerId]) {
        // Using direct longitude and latitude for GetFeatureInfo
        // Construct the URL for GetFeatureInfo request
        const url = `https://dev.cas-zimbabwe.predictia.es/wms?REQUEST=GetFeatureInfo&SERVICE=WMS&VERSION=1.1.1&lon=${lng}&lat=${lat}&layer=${layerId}`;
        
        // Fetch the data value
        fetch(url)
          .then(response => response.json())
          .then(data => {
            let valueText = 'No data available';
            
            // Extract the value from the response
            const value = data[layerId];
            if (value !== undefined) {
              valueText = `${$datalaag}: ${Math.round(value*10)/10} ${getLegendUnit($datalaag)}`;
            }
            
            // Update popup content
            popup.setContent(
              `<div class="popup-content">${valueText}</div>`
            );
          })
          .catch(error => {
            console.error('Error fetching WMS value:', error);
            popup.setContent(
              `<div class="popup-content">Error loading value</div>`
            );
          });
      } else {
        // No active layer
        popup.setContent(
          `<div class="popup-content">No active layer</div>`
        );
      }
    });
  }
</script>

<style>
  :global(.popup-content) {
    padding: 5px;
    font-size: 14px;
    text-align: center;
  }
</style>
