<script>
  import BackgroundMap from "$lib/components/BackgroundMap.svelte"

  export let w
  export let h

  const getData = (async () => {
    const response = await Promise.all([
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmax_Era5_1980-2015.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmax_CMIP6_2041-2060_SSP5-8.5.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmax_CMIP6_2041-2060_SSP1%20-%202.6.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmin_Era5_1980-2015.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmin_CMIP6_2041-2060_SSP5-8.5.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Tmin_CMIP6_2041-2060_SSP1%20-%202.6.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Precip_Era5_1980-2015.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Precip_CMIP6_2041-2060_SSP5%20-%208.5.geojson"),
      fetch("https://raw.githubusercontent.com/sophievanderhorst/data/main/kea%20Ghana/Precip_CMIP6_2041-2060_SSP1%20-%202.6.geojson"),
    ])
    return [
      await response[0].json(),
      await response[1].json(),
      await response[2].json(),
      await response[3].json(),
      await response[4].json(),
      await response[5].json(),
      await response[6].json(),
      await response[7].json(),
      await response[8].json(),
    ]
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
  svg {
    width: 100%;
    height: 100%;
  }
</style>
