<script>
  import BackgroundMap from "$lib/components/BackgroundMap.svelte"

  export let w
  export let h

 
</script>

<div style="width: 100%; height: 100%;">
  <BackgroundMap />
</div>

<style>
  svg {
    width: 100%;
    height: 100%;
  }
</style>
