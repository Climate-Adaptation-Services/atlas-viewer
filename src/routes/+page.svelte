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
			<!-- Phones only: the drawer covers almost the whole map, so offer an
			     obvious way back to it that stays in view while scrolling. -->
			<div class="show-map-bar">
				<button class="show-map-btn" type="button" on:click={togglePanel}>Show map</button>
			</div>
		</div>
	</div>
	{#if open}
		<!-- Phones only: tapping the strip of map beside the drawer closes it
		     (instead of opening a map popup behind the panel). -->
		<button class="panel-backdrop" type="button" aria-label="Close panel" on:click={togglePanel}></button>
	{/if}
	<button
		class="toggle-arrow"
		class:panel-open={open}
		on:click={togglePanel}
		on:keydown={(e) => e.key === 'Enter' && togglePanel()}
		aria-label={open ? "Close panel" : "Open panel"}
		type="button"
	>
		<span class="tooltip">{open ? "Close panel" : "Open panel"}</span>
		<svg class="toggle-arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			{#if open}
				<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			{:else}
				<path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			{/if}
		</svg>
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

/* Phones and tablets (also phones held sideways): a drawer on the left edge.
   Capped at 360px so it does not swallow a wide-but-short screen. */
@media (max-width: 1024px) {
	.sidepanel-wrapper {
		width: min(85vw, 360px);
		left: 0;
		top: 0;
		height: 100vh;
		height: 100dvh; /* excludes the mobile browser's address bar */
	}

	.sidepanel {
		/* Keep the padding inside the drawer's width/height; without this the
		   panel is wider and taller than its wrapper, so its bottom is cut off
		   and a strip stays visible when it is closed. */
		box-sizing: border-box;
		border-radius: 0 15px 15px 0;
		padding-left: min(4vw, 16px);
		padding-right: min(4vw, 16px);
		padding-top: 3vh;
	}
}

.toggle-arrow {
	position: fixed;
	top: calc(5vh + 10px);
	left: 25px; /* Default: visible at left when closed, just outside panel edge */
	cursor: pointer;
	background-color: #fff;
	border: 1px solid rgba(0, 0, 0, 0.08);
	width: 30px;
	height: 30px;
	padding: 0;
	border-radius: 50%;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	z-index: 2000001;
	transition: left 0.3s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
	appearance: none;
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #5a6b7b;
}

.toggle-arrow:hover {
	color: #017e9f;
	border-color: rgba(1, 126, 159, 0.35);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.16);
}

.toggle-arrow-icon {
	display: block;
	width: 16px;
	height: 16px;
}

.toggle-arrow.panel-open {
	left: calc(1vw + 18vw - 10px); /* Position at right edge when open */
}

/* On large screens the fixed -10px overlap reads as the button sitting too far
   inside the panel; nudge it right so it keeps hugging the right edge. Small /
   laptop screens are intentionally left untouched. */
@media (min-width: 1600px) {
	.toggle-arrow.panel-open {
		left: calc(1vw + 18vw + 6px);
	}
}

/* Position the toggle arrow for mobile */
@media (max-width: 1024px) {
	.toggle-arrow {
		top: 12px;
		left: 25px;
		background-color: rgba(255, 255, 255, 0.9);
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.toggle-arrow.panel-open {
		left: calc(min(85vw, 360px) - 15px); /* Position at right edge when open */
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

/* "Show map" bar and tap-outside-to-close: phones only (see markup). */
.show-map-bar,
.panel-backdrop {
	display: none;
}

@media (max-width: 600px) {
	.show-map-bar {
		display: block;
		position: sticky;
		bottom: 0;
		margin-top: auto; /* sit at the bottom when the content is short */
		padding: 16px 0 12px;
		background: linear-gradient(to bottom, rgba(250, 250, 250, 0) 0, #fafafa 14px);
	}

	.show-map-btn {
		display: block;
		width: 100%;
		height: 44px;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 10px;
		background-color: #017e9f;
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
	}

	.panel-backdrop {
		display: block;
		position: fixed;
		inset: 0;
		z-index: 1999999; /* just below the drawer, above map and legend */
		margin: 0;
		padding: 0;
		border: none;
		background: rgba(0, 0, 0, 0.15);
	}
}

/* Phones and tablets: a finger-sized toggle. When the drawer is open it sits
   just outside the drawer's edge, below the zoom buttons, so it no longer
   covers the panel's content while scrolling. */
@media (max-width: 1024px) {
	.toggle-arrow {
		width: 40px;
		height: 40px;
		left: 12px;
		transition: left 0.3s ease, top 0.3s ease, color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
	}

	.toggle-arrow.panel-open {
		left: calc(min(85vw, 360px) + 8px);
		top: 86px;
	}

	.toggle-arrow-icon {
		width: 20px;
		height: 20px;
	}
}

</style>
