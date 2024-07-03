import { writable, derived } from 'svelte/store';

export const buurtGrenzen = writable(0);
export const leafletMap = writable(null);
export const tileLayer = writable(null);
export const tilelayerOpacity = writable(100);
export const datalaag = writable('Empty');
export const time = writable('Current');
export const theme = writable('heter');
export const scenario = writable('Low');


export const panelOpen = writable(true)
