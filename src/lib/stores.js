import { writable, derived } from 'svelte/store';

export const buurtGrenzen = writable(0);
export const leafletMap = writable(null);
export const tilelayerOpacity = writable(100);
export const datalaag = writable('Empty');
export const scenario = writable('Current');
