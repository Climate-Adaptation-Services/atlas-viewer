<script>
    import {datalaag} from "$lib/stores.js";
    import {scenario} from "$lib/stores.js";
    import {time} from "$lib/stores.js";
    import {theme} from "$lib/stores.js";
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher()

    const optionsTemperature = ['Maximum temperature', 'Minimum temperature', 'Average temperature',]
    const optionsDrought = ['Dry days']
    const optionsPrecipitation = ['Total precipitation', 'Days above 20 mm']
    const options2= [{ id: 0, name: 'Current' }, { id: 1, name: '2050' }, { id: 2, name: '2100' }]
    const options3= [{ id: 0, name: 'Low' }, { id: 1, name: 'High' }]

    $: options = ($theme === 'heter')
        ? optionsTemperature 
        : ($theme === 'precipitation')
            ? optionsPrecipitation
            : optionsDrought
    
    $: if ($theme){
        datalaag.set(options[0])
    }


    export let selectedTime = 0;
    export let selectedScenario = 0;    

    function handleClickTheme(event) {
		theme.set(event.target.id)
        console.log(event.target.id)
        let selectedTheme = document.getElementsByClassName($theme)
        let prevTheme = document.querySelector('.active')
        let prevCaption= document.querySelector('.activecaption')
        console.log(selectedTheme)
        if(prevTheme) {
            prevTheme.classList.remove('active');
            prevCaption.classList.remove('activecaption');
        }
        selectedTheme[0].classList.add('active');
        selectedTheme[1].classList.add('activecaption');
    }

    function setSelectedTime(e){
        const newValue = Number(e.target.value)
        selectedTime = newValue
        dispatch('change', {value: newValue})
        $time = options2.find(x => x.id === selectedTime).name
    }

    function setSelectedScenario(e){
        const newValue = Number(e.target.value)
        selectedScenario = newValue
        dispatch('change', {value: newValue})
        $scenario = options3.find(x => x.id === selectedScenario).name
    }

    $: console.log($time, $scenario)

</script>

<section> 
    <h2 class = 'first'>Choose theme</h2>
    <div class="item">
        <img class = 'themelogo heter active' id = 'heter' src="https://raw.githubusercontent.com/sophievanderhorst/data/main/hitte_carib.png" on:click={handleClickTheme}>
        <p class="caption heter activecaption">It's getting hotter</p>
    </div>
    <div class="item">
        <img class = 'themelogo droger' id = 'droger' src="https://raw.githubusercontent.com/sophievanderhorst/data/main/droogte_carib.png" on:click={handleClickTheme}> 
        <p class="caption droger">It's getting dryer</p>
    </div>
    <div class="item">
        <img class = 'themelogo precipitation' id = 'precipitation' src="https://raw.githubusercontent.com/sophievanderhorst/data/main/wind_carib.png" on:click={handleClickTheme}> 
        <p class="caption precipitation ">It's getting wetter</p>
    </div>
    <h2>Select layer</h2>
    {#each options as option}
        <label class='keuzes'>
            <input
                class = 'option'
                type="radio"
                name="laag"
                value={option}
                bind:group={$datalaag}
            />
            {option}
        </label>
    {/each}
    <h2>Select time period</h2>
    <div class="buttons-wrapper">
        <div class="buttons">
            {#each options2 as option, index}
                <button 
                    class={selectedTime === index ? 'selected' : ''} 
                    value={option.id}
                    name={option.name}
                    on:click={setSelectedTime}>
                        {option.name}
                </button>
            {/each}
        </div>
    </div>  
    {#if $time === '2050' || $time === '2100'}
        <h2>Select scenario</h2>
        <div class="buttons-wrapper">
            <div class="buttons">
                {#each options3 as option, index}
                    <button 
                        class={selectedScenario === index ? 'selected' : ''} 
                        value={option.id}
                        name={option.name}
                        on:click={setSelectedScenario}>
                            {option.name}
                    </button>
                {/each}
            </div>
        </div> 
    {/if}    
</section>

<style>
    .keuzes{
        margin-top:1vh;
        font-size: 2vh;
        display:block;
    }  

    .logo{
        width:23vw;
        margin-bottom:12vh;
    } 
  

    button{
        margin:0.5vw;
        height: 6vh;
        width: 6vw;
        border-radius: 30px;
        border-width: 0.3vh;
        font-size: 1.8vh;       
        background-color: 'lightgrey';
        margin-bottom: 2vh;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s;
    }

    button:hover {
        background-color: #017E9F;
        color: white;
    }

    button.selected {
        background-color: #017E9F;
        color: white;
    }

    .description{
        font-size:2vh;
    }

    .source{
        font-size:2vh;
        font-style: italic;
        bottom: 2vh;
    }

    .first{
        margin-top: 6vh; 
    }
    
    h2{
        margin-top: 3vh; 
        font-size: 2.8vh;
    }

    div.item {
        vertical-align: top;
        display: inline-block;
        text-align: center;
        width: 6vw;
        margin:0vw;
        margin-bottom: 0vh; 
    }

    .themelogo{
        width:4vw;     
    }

    .caption{
        font-size:1.7vh;
        display: block;   
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



</style>
  