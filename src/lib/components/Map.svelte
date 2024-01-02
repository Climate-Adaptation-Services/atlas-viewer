<script>
  import BackgroundMap from '$lib/components/BackgroundMap.svelte'

  export let w;
  export let h;

  const getData = (async () => {
		const response = await Promise.all([
      fetch('https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Ghana_era5_maxtemp_clip.geojson'), 
      fetch('https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/cmip6-maxtemp_mid_ssp585.geojson'),
      fetch('https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/cmip6-maxtemp_mid_ssp126.geojson')
    ])
    return [await response[0].json(), await response[1].json(), await response[2].json()] //, await response[4].json(), await response[5].json(), await response[6].json(), await response[7].json(), await response[8].json()]
	})()


</script>


<div style="width: 100%; height: 100%;">
  {#await getData}
    <pre>Loading...</pre>
  {:then res}
    <BackgroundMap datajson={res} />
  {:catch error}
  	<p>An error occurred!</p>
  {/await}
</div>

<style>

svg{
  width:100%;
  height:100%;
}
</style>
