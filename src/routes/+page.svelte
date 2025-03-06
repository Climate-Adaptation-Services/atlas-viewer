<script>
	import Sidepanel from '$lib/components/Sidepanel.svelte'
	import Map from '$lib/components/Map.svelte'
	import { onMount } from 'svelte';
	import { panelOpen } from "$lib/stores.js"

	let w;
	let h;

	let open = true;

	$: console.log($panelOpen)
	

	// Subscribe to the store
  onMount(() => {
    const unsubscribe = panelOpen.subscribe(value => {
      open = value;
    });

    return () => {
      unsubscribe();
    };
  });

  function togglePanel() {
    panelOpen.update(value => !value);
  }
</script>

<div class='container'>
	<div class:open={open} class="sidepanel" >
		<Sidepanel/>
		<div class="toggle-arrow" on:click={togglePanel}>
			<span class="tooltip">{open ? "Close panel" : "Open panel"}</span>
			{#if open}
				&larr; 
			{:else}
				&rarr; 
			{/if}
		</div>
	</div>	
	<div class='map' bind:clientWidth={w} bind:clientHeight={h} >
		<Map {w} {h} />
	</div>
	
	
</div>


<style>

.container{
	height:100%;
	width:100%;
	display:flex;
	overflow: hidden; /* Ensure elements don't overflow */
}

.map{
	flex:2;
	display:flex;
	flex-direction:column;	
	height:100%;	
	transition: margin-left 0.3s ease;
	margin-left: 0;
}

.sidepanel{
	display:flex;
	flex-direction:column;
	padding-left:2vw;
	padding-right:2vw;
	position: fixed;
	width: 16vw;
	left: 1vw;
	top:10vh;
	height: 80vh;
	background-color: #F8F3EE;
	box-shadow: 2px 0 5px rgba(0,0,0,0.1);
	z-index: 1000;	
	transform: translateX(-100%);
    transition: transform 0.3s ease;
	border-radius: 15px; /* Add rounded corners */
}

.sidepanel.open {
	transform: translateX(0);
	background-color: #fafafa; /* Slightly different color for better visual effect */
	}

.toggle-arrow {
	position: absolute;
	top: 10px; 
	right: -30px; 
	cursor: pointer;
	background-color: #fff;
	border: 1px solid #ccc;
	padding: 5px;
	border-radius: 50%;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	z-index: 1001; /* Ensure it is above the sidepanel */
	transition: transform 0.3s ease; /* Ensure it transitions with the sidepanel */
}

.tooltip {
	visibility: visible;
	width: 100px;
	background-color: #555;
	color: #fff;
	text-align: center;
	border-radius: 6px;
	padding: 5px;
	position: absolute;
	z-index: 10002;
	top: -5px; /* Position above the arrow */
	left: 90px;
	transform: translateX(-50%);
	margin-top: 5px; /* Space between the arrow and the tooltip */
	opacity: 0;
	transition: opacity 0.3s;
}

.toggle-arrow:hover .tooltip {
	visibility: visible;
	opacity: 1;
}

</style>
