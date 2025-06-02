<script>
  import { datalaag, scenario, time, theme, opacityMap } from "$lib/stores.js"
  import { createEventDispatcher } from "svelte"

  const dispatch = createEventDispatcher()

  const optionsTemperature = ["Average temperature", "Minimum temperature", "Maximum temperature"]
  const optionsDrought = ["Dry spells"]
  const optionsPrecipitation = ["Total rainfall", "Days above 20 mm"]
  const options2 = [
    { id: 0, name: "Past" },
    { id: 1, name: "2050" },
    { id: 2, name: "2080" },
  ]
  const options3 = [
    { id: 0, name: "Low" },
    { id: 1, name: "High" },
  ]

  $: options = $theme === "heter" ? optionsTemperature : $theme === "precipitation" ? optionsPrecipitation : optionsDrought

  $: if ($theme) {
    datalaag.set(options[0])
  }

  export let selectedTime = 0
  export let selectedScenario = 0

  function handleClickTheme(event) {
    theme.set(event.target.id)
    console.log(event.target.id)
    let selectedTheme = document.getElementsByClassName($theme)
    let prevTheme = document.querySelector(".active")
    let prevCaption = document.querySelector(".activecaption")
    console.log(selectedTheme)
    if (prevTheme) {
      prevTheme.classList.remove("active")
      prevCaption.classList.remove("activecaption")
    }
    selectedTheme[0].classList.add("active")
    selectedTheme[1].classList.add("activecaption")
  }

  function setSelectedTime(e) {
    const newValue = Number(e.target.value)
    selectedTime = newValue
    dispatch("change", { value: newValue })
    $time = options2.find((x) => x.id === selectedTime).name
  }

  function setSelectedScenario(e) {
    const newValue = Number(e.target.value)
    selectedScenario = newValue
    dispatch("change", { value: newValue })
    $scenario = options3.find((x) => x.id === selectedScenario).name
  }

  $: console.log($time, $scenario)
</script>

<section>
  <h2 class="first">Choose a climate theme</h2>
  <div class="item">
    <img
      class="themelogo heter active"
      id="heter"
      src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/heat.svg"
      on:click={handleClickTheme} />
    <p class="caption heter activecaption">Heat</p>
  </div>
  <div class="item">
    <img
      class="themelogo droger"
      id="droger"
      src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/drought.svg"
      on:click={handleClickTheme} />
    <p class="caption droger">Drought</p>
  </div>
  <div class="item">
    <img
      class="themelogo precipitation"
      id="precipitation"
      src="https://raw.githubusercontent.com/sophievanderhorst/data/refs/heads/main/map-viewer/rain.svg"
      on:click={handleClickTheme} />
    <p class="caption precipitation">Extreme rain</p>
  </div>
  
  <h2>Select a map layer</h2>
  {#each options as option}
    <label class="keuzes">
      <input class="option" type="radio" name="laag" value={option} bind:group={$datalaag} />
      {option}
    </label>
  {/each}
  <h2 style="display: inline-flex; align-items: center; gap: 0.5em;">
    Select time period
    <span class="info-icon-wrapper">
      <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#0077b6" stroke-width="2" fill="#e9f5fb"/>
  <text x="12" y="16" text-anchor="middle" fill="#0077b6" font-weight="bold" style="font-family: serif;">i</text>
</svg>
      <span class="tooltip">
        <ul class="tooltip-list">
          <li><strong>Past:&nbsp;</strong>observed data for 1981–2010</li>
          <li><strong>2050:&nbsp;</strong>projected data for 2036–2065</li>
          <li><strong>2080:&nbsp;</strong>projected data for 2066–2095</li>
       </ul>
      </span>
    </span>
  </h2>
  <div class="buttons-wrapper">
    <div class="buttons">
      {#each options2 as option, index}
        <button class={selectedTime === index ? "selected" : ""} value={option.id} name={option.name} on:click={setSelectedTime}>
          {option.name}
        </button>
      {/each}
    </div>
  </div>
  {#if $time === "2050" || $time === "2080"}
    <h2 style="display: inline-flex; align-items: center; gap: 0.5em;">
      Select a scenario
      <span class="info-icon-wrapper">
        <svg class="info-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#0077b6" stroke-width="2" fill="#e9f5fb"/>
          <text x="12" y="16" text-anchor="middle" fill="#0077b6" font-weight="bold" style="font-family: serif;">i</text>
        </svg>
        <span class="tooltip">
          <ul class="tooltip-list">
            <li><strong>Low:&nbsp;</strong> Low emissions (SSP1-2.6)</li>
            <li><strong>High:&nbsp;</strong> High emissions (SSP5-8.5)</li>
          </ul>
        </span>
      </span>
    </h2>
    <div class="buttons-wrapper">
      <div class="buttons">
        {#each options3 as option, index}
          <button class={selectedScenario === index ? "selected" : ""} value={option.id} name={option.name} on:click={setSelectedScenario}>
            {option.name}
          </button>
        {/each}
      </div>
    </div>
  {/if}
  <h2>Map transparency</h2>
  <div class="opacity-slider">
    <input
      type="range"
      id="opacity"
      min="0"
      max="1"
      step="0.1"
      bind:value={$opacityMap}
      style="background: linear-gradient(to right, #017E9F 0%, #017E9F {$opacityMap * 100}%, #ddd 0%);" />
  </div>
</section>

<style>
  /* Mobile responsive styles */
  @media (max-width: 768px) {
    h2 {
      font-size: 2.5vh !important;
      margin-top: 1vh !important;
    }
    
    h2.first {
      margin-top: 3vh !important;
    }
    
    .keuzes {
      font-size: 2.4vh !important;
      gap: 2vw !important;
      margin-bottom: 1.5vh !important;
    }
    
    .option {
      width: 3vh !important;
      height: 3vh !important;
    }
    
    .option:checked::after {
      font-size: 2vh !important;
    }
    
    button {
      height: 7vh !important;
      width: 20vw !important;
      font-size: 2.4vh !important;
      margin-right: 2vw !important;
    }
    
    .caption {
      font-size: 2.2vh !important;
    }
    
    .themelogo {
      width: 8vw !important;
    }
    
    div.item {
      width: 10vw !important;
      margin-right: 2vw !important;
    }
  }
  
  .info-icon-wrapper {
    position: relative;
    display: inline-block;
  }
  .info-icon {
    cursor: pointer;
    vertical-align: middle;
    width: 3vh; /* Base size using viewport height */
    height: 3vh;
    min-width: 20px; /* Minimum size for small screens */
    min-height: 20px;
  }
  
  /* Font size for the 'i' character */
  .info-icon text {
    /* Ensure minimum font size of 14px */
    font-size: max(14px, 1.6vh);
    font-weight: bold;
    font-family: serif;
    transform: translateY(1px); /* Fine-tune vertical alignment */
  }
  
  /* Font size adjustments for different screen sizes */
  @media (min-width: 1200px) {
    .tooltip {
      font-size: 0.8em;
    }
  }
  
  /* Additional size guarantee for very small screens */
  @media (max-height: 500px) {
    .info-icon {
      width: 24px;
      height: 24px;
    }
    
    .info-icon text {
      font-size: 16px;
    }
  }
  .tooltip {
    visibility: hidden;
    width: max-content; /* Fit content width */
    min-width: 200px;
    max-width: 320px;
    background-color: #333;
    color: #fff;
    text-align: left;
    border-radius: 6px;
    padding: 12px 14px;
    position: absolute;
    z-index: 1;
    bottom: 120%;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.85em;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    pointer-events: none;
    white-space: normal; /* Allow text to wrap if needed */
  }
  
  .tooltip-list {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }
  
  .tooltip-list li {
    position: relative;
    padding-left: 12px;
    margin-bottom: 0;
    line-height: 1.5;
    display: flex;
    align-items: baseline;
  }
  
  .tooltip-list li:first-child {
    margin-top: 0;
  }
  
  .tooltip-list li:last-child {
    margin-bottom: 0;
  }
  
  .tooltip-list li:before {
    content: "•";
    position: absolute;
    left: 0;
    color: white;
    font-size: 14px;
    line-height: 0;
    top: 50%;
    transform: translateY(-50%);
  }
  .info-icon-wrapper:hover .tooltip {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }

  .keuzes {
    display: flex;
    align-items: center;
    gap: 0.8vw;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    font-size: 1.9vh;
  }

  /* Style the square option box */
  .option {
    appearance: none;
    width: 2vh; /* Adjusted for a square look */
    height: 2vh; /* Equal width & height */
    border: 2px solid #017e9f;
    border-radius: 4px; /* Slightly rounded corners */
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.8vh;
  }

  /* Add checkmark on selection */
  .option:checked {
    background-color: #017e9f;
    border-color: #017e9f;
  }

  .option:checked::after {
    content: "✔"; /* Unicode checkmark */
    color: white;
    font-size: 1.4vh;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .logo {
    width: 23vw;
    margin-bottom: 12vh;
  }

  button {
    margin-right: 0.5vw;
    height: 6vh;
    width: 4.5vw;
    border-radius: 30px;
    border-width: 0.3vh;
    font-size: 1.9vh;
    background-color: "lightgrey";
    margin-bottom: 1vh;
    cursor: pointer;
    transition:
      background-color 0.3s,
      color 0.3s;
  }

  button:hover {
    background-color: #017e9f;
    color: white;
  }

  button.selected {
    background-color: #017e9f;
    color: white;
  }

  .description {
    font-size: 2vh;
  }

  .source {
    font-size: 2vh;
    font-style: italic;
    bottom: 2vh;
  }

  .first {
    margin-top: 4vh;
  }

  h2 {
    margin-top: 1vh;
    font-size: 2vh;
  }

  div.item {
    vertical-align: top;
    display: inline-block;
    text-align: center;
    width: 3vw;
    margin: 0vw;
    margin-bottom: 0vh;
    font-size: 3vh;
    margin-right: 0.5vw;
    /* border: 1px solid #017E9F;
        border-radius: 10px; */
  }

  .themelogo {
    width: 2.7vw;
  }
  
  /* Increase theme icon size on mobile devices */
  @media (max-width: 768px) {
    .themelogo {
      width: 6vw;
      min-width: 32px;
    }
    
    div.item {
      width: 6vw !important;
      min-width: 32px;
      margin-right: 3vw !important;
    }
    
    .caption {
      font-size: 2vh;
    }
  }

  .caption {
    font-size: 1.7vh;
    margin-top: 0.1vh;
    margin-bottom: 0vh;
  }

  .themelogo:not(.active) {
    opacity: 0.3;
  }

  .caption:not(.activecaption) {
    opacity: 0;
  }

  .countrylogo:not(.activecountry) {
    opacity: 0.3;
  }

  .opacity-slider {
    z-index: 1000000;
    padding-top: 0vh;
  }

  .opacity-slider input {
    -webkit-appearance: none;
    width: 100%;
    padding: 0px;
    border-radius: 9999px;
    height: 1.5vh;
  }

  /* Custom thumb (slider handle) */
  .opacity-slider input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 3vh;
    height: 3vh;
    background-color: var(--thumb-color, #017e9f); /* Dynamic color */
    border-radius: 50%;
    border: 2px solid white;
    cursor: pointer;
    transition: background-color 0.3s ease-in-out;
  }
</style>
