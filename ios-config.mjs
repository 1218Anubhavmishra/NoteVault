// Run after `npx cap sync ios` (npm run cap:sync:ios does this).
// WKWebView blocks the api.voicevault.xyz session cookie when the app origin is
// capacitor://localhost; serving the app from a voicevault.xyz host makes it first-party.
import { readFileSync, writeFileSync } from 'node:fs';

const IOS_HOSTNAME = 'app.voicevault.xyz';
const file = new URL('./ios/App/App/capacitor.config.json', import.meta.url);

const config = JSON.parse(readFileSync(file, 'utf8'));
config.server = { ...config.server, hostname: IOS_HOSTNAME };
writeFileSync(file, JSON.stringify(config, null, '\t') + '\n');
console.log(`[ios-config] server.hostname = ${IOS_HOSTNAME}`);
