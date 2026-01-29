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
		<button
			class="toggle-arrow"
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
	</div>
	<!-- Mobile-only toggle that appears when panel is closed -->
	<button 
		class="mobile-toggle" 
		class:hidden={open} 
		on:click={togglePanel}
		on:keydown={(e) => e.key === 'Enter' && togglePanel()}
		aria-label="Open panel"
		type="button"
	>
		&rarr;
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
	width: 20vw; /* Default width for desktop */
	left: 1vw;
	top: 5vh;
	height: 90vh;
	z-index: 2000000;
	transform: translateX(-100%);
	transition: transform 0.3s ease;
}

.sidepanel-wrapper.open {
	transform: translateX(0);
}

.sidepanel {
	display: flex;
	flex-direction: column;
	padding-left: 2vw;
	padding-right: 2vw;
	width: 100%;
	height: 100%;
	background-color: #F8F3EE;
	box-shadow: 2px 0 5px rgba(0,0,0,0.1);
	border-radius: 15px;
	overflow-y: auto;
	overflow-x: hidden;
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
	}
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
	appearance: none;
	line-height: 1;
}

/* Position the toggle arrow for mobile */
@media (max-width: 768px) {
	.toggle-arrow {
		top: 10px;
		right: 10px;
		background-color: transparent;
		border: none;
		box-shadow: none;
		padding: 8px;
		font-size: 18px;
	}
	
	.toggle-arrow .tooltip {
		display: none; /* Hide tooltip on mobile to save space */
	}
	
	/* Mobile toggle button that appears when panel is closed */
	.mobile-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		position: fixed;
		top: 15px;
		left: 15px;
		background-color: #017e9f;
		color: white;
		border: none;
		box-shadow: 0 2px 8px rgba(0,0,0,0.2);
		padding: 12px 16px;
		font-size: 20px;
		z-index: 1002;
		cursor: pointer;
		border-radius: 8px;
	}

	.mobile-toggle.hidden {
		display: none;
	}
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

/* Hide mobile toggle on desktop */
@media (min-width: 769px) {
	.mobile-toggle {
		display: none;
	}
}

</style>
