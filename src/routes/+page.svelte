<script>
	import Sidepanel from '$lib/components/Sidepanel.svelte'
	import Map from '$lib/components/Map.svelte'

	let w;
	let h;

</script>

<div class='container'>
	<div class = 'sidepanel'>
		<Sidepanel/>
	</div>
	<div class='map' bind:clientWidth={w} bind:clientHeight={h} >
		<Map {w} {h} />
	</div>
</div>


<style>

.container{
	height:100%;
	display:flex;
}
.map{
	flex:2;
	display:flex;
	flex-direction:column;	
	height:100%;	
	width:75vw;
}

.sidepanel{
	display:flex;
	flex-direction:column;
	padding-left:2vw;
	padding-right:2vw;
	padding-top:4vh;
	width:21vw;
	
}

</style>
