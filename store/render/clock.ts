import { NOW } from './demo';

// Картинки не должны зависеть от того, когда их сняли. ?at=11:10 — другое время того же дня.
const at = new URLSearchParams(location.search).get('at')?.match(/^(\d{1,2}):(\d{2})$/);
const now = at ? new Date(NOW).setHours(Number(at[1]), Number(at[2])) : NOW;
Date.now = () => now;
