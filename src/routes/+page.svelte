<script>
	import Sidepanel from '$lib/components/Sidepanel.svelte'
	import BackgroundMap from "$lib/components/BackgroundMap.svelte"
	import { onMount } from 'svelte';
	import { panelOpen } from "$lib/stores.js"

	let w;
	let h;

	let open = true;	

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
	<div class:open={open} class="sidepanel-wrapper">
		<div class="sidepanel">
			<Sidepanel/>
		</div>
	</div>
	<button
		class="toggle-arrow"
		class:panel-open={open}
		on:click={togglePanel}
		on:keydown={(e) => e.key === 'Enter' && togglePanel()}
		aria-label={open ? "Close panel" : "Open panel"}
		type="button"
	>
		<span class="tooltip">{open ? "Close panel" : "Open panel"}</span>
		{#if open}
			&larr;
		{:else}
			&rarr;
		{/if}
	</button>

	<div class='map' bind:clientWidth={w} bind:clientHeight={h} >
		<BackgroundMap />
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

.sidepanel-wrapper {
	position: fixed;
	width: 18vw; /* Default width for desktop */
	left: 1vw;
	top: 5vh;
	height: 90vh;
	z-index: 2000000;
	transform: translateX(calc(-100% - 2vw)); /* Fully hidden when closed */
	transition: transform 0.3s ease;
	overflow: visible;
}

.sidepanel-wrapper.open {
	transform: translateX(0);
}

.sidepanel {
	display: flex;
	flex-direction: column;
	padding-left: 1vw;
	padding-right: 1vw;
	width: 100%;
	height: 100%;
	background-color: #F8F3EE;
	box-shadow: 2px 0 5px rgba(0,0,0,0.1);
	border-radius: 15px;
	overflow-y: auto;
	overflow-x: clip;
	scrollbar-width: thin;
	scrollbar-gutter: stable;
}

.sidepanel-wrapper.open .sidepanel {
	background-color: #fafafa;
}

/* Webkit scrollbar styling */
.sidepanel::-webkit-scrollbar {
	width: 6px;
}

.sidepanel::-webkit-scrollbar-track {
	background: transparent;
}

.sidepanel::-webkit-scrollbar-thumb {
	background-color: rgba(0, 0, 0, 0.2);
	border-radius: 3px;
}

/* Responsive width for mobile devices */
@media (max-width: 800px) {
	.sidepanel-wrapper {
		width: 85vw;
		left: 0;
		top: 0;
		height: 100vh;
	}

	.sidepanel {
		border-radius: 0 15px 15px 0;
		padding-left: 4vw;
		padding-right: 4vw;
		padding-top: 3vh;
	}
}

.toggle-arrow {
	position: fixed;
	top: calc(5vh + 10px);
	left: 25px; /* Default: visible at left when closed, just outside panel edge */
	cursor: pointer;
	background-color: #fff;
	border: 1px solid #ccc;
	padding: 5px;
	border-radius: 50%;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
	z-index: 2000001;
	transition: left 0.3s ease;
	appearance: none;
	line-height: 1;
}

.toggle-arrow.panel-open {
	left: calc(1vw + 18vw - 10px); /* Position at right edge when open */
}

/* Position the toggle arrow for mobile */
@media (max-width: 768px) {
	.toggle-arrow {
		top: 12px;
		left: 25px;
		padding: 5px 7px;
		font-size: 14px;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.toggle-arrow.panel-open {
		left: calc(85vw - 15px); /* Position at right edge when open */
	}

	.toggle-arrow .tooltip {
		display: none;
	}
}

.tooltip {
	visibility: hidden;
	width: max-content;
	background-color: rgba(255, 255, 255, 0.98);
	color: #555;
	text-align: center;
	border-radius: 4px;
	padding: 4px 8px;
	position: absolute;
	z-index: 10002;
	top: 50%;
	left: calc(100% + 8px);
	transform: translateY(-50%);
	font-size: 11px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
	border: 1px solid rgba(0, 0, 0, 0.08);
	opacity: 0;
	transition: opacity 0.2s, visibility 0.2s;
}

.toggle-arrow:hover .tooltip {
	visibility: visible;
	opacity: 1;
}


</style>
