<script>
    import {datalaag} from "$lib/stores.js";
    import {scenario} from "$lib/stores.js";

    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher()

    // export let w;
    // export let h;

    const options = ['Maximum temperature', 'Minimum temperature', 'Annual precipitation',]
    const options2= [{ id: 0, name: 'Current' }, { id: 1, name: '2050 low' }, { id: 2, name: '2050 high' }]

    export let selected = 0
    

    function setSelected(e){
        const newValue = Number(e.target.value)
        selected = newValue
        dispatch('change', {value: newValue})
        $scenario = options2.find(x => x.id === selected).name
    }

</script>

<section>  
    

    <img class = 'logo' id = 'logo' src="https://raw.githubusercontent.com/sophievanderhorst/data/main/logo%20ghana.png">
    <h4>Select a layer:</h4>
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
    <h4>Select a scenario:</h4>
    <div class="buttons-wrapper">
        <div class="buttons">
            {#each options2 as option, index}
                <button 
                    class={selected === index ? 'selected' : ''} 
                    value={option.id}
                    name={option.name}
                    on:click={setSelected}>
                        {option.name}
                </button>
            {/each}
        </div>
    </div>
    <p class = "description">
        The map shows the {$datalaag} for the {$scenario} timeperiod
    </p>
    <p class = "source">
        Source: IPCC atlas
    </p>
<<<<<<< Updated upstream
    
=======
>>>>>>> Stashed changes
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
        margin-bottom: 4vh;
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


</style>
  