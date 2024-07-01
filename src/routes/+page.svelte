<script>
	import Sidepanel from '$lib/components/Sidepanel.svelte'
	import Map from '$lib/components/Map.svelte'

	let w;
	let h;
	
	let isSidepanelVisible = true;

	function toggleSidepanel() {
		isSidepanelVisible = !isSidepanelVisible;
	}

</script>

<div class='container'>
	{#if isSidepanelVisible}
		<div class='sidepanel {isSidepanelVisible ? 'visible' : 'hidden'}' >
			<Sidepanel/>
		</div>
	{/if}
	<button class='toggle-button' on:click={toggleSidepanel}>
		{isSidepanelVisible ? 'Hide Sidepanel' : 'Show Sidepanel'}
	</button>
	<div class='map' bind:clientWidth={w} bind:clientHeight={h} >
		<Map {w} {h} />
	</div>
	
</div>


<style>

.container{
	height:100%;
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
	padding-top:4vh;
	transition: transform 5s ease;
	position: absolute;
	width: 25vw;
	left: 0;
	top: 1vh;
	height: 94vh;
	background-color: white;
	box-shadow: 2px 0 5px rgba(0,0,0,0.1);
	z-index: 1000
	
}

.sidepanel.visible {
		transform: translateX(0);
		box-shadow: 2px 0 15px rgba(0, 0, 0, 0.2);
		background-color: #fafafa; /* Slightly different color for better visual effect */
	}

.sidepanel.hidden {
	transform: translateX(-100%);
}

.toggle-button {
	position: absolute;
	top: 10px;
	right: 10px;
	padding: 10px;
	background-color: #007bff;
	color: white;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	z-index: 1001; /* Ensure the button is above other elements */
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.toggle-button:hover {
	background-color: #0056b3;
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}


</style>
