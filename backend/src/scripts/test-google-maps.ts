import {
  parseCoordinates,
  decodePlusCode,
  isGoogleMapsUrl,
  isValidDanangCoordinates,
} from '../utils/google-maps.js';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}`);
    failed++;
  }
}

console.log('--- TESTING GOOGLE MAPS RESOLVER (STORY 17.5) ---');

// 1. SSRF Guard
assert('SSRF localhost rejected', !isGoogleMapsUrl('http://localhost:5000/api'));
assert('SSRF private IP rejected', !isGoogleMapsUrl('https://192.168.1.1/maps'));
assert('Fake domain rejected', !isGoogleMapsUrl('https://attacker-maps.com/maps'));
assert('Valid maps.app.goo.gl', isGoogleMapsUrl('https://maps.app.goo.gl/abc123xyz'));
assert('Valid google.com/maps', isGoogleMapsUrl('https://www.google.com/maps/place/something'));

// 2. Exact pin parsing (!3d & !4d)
const pinUrl = 'https://www.google.com/maps/place/DaNang/@16.0600,108.2200,17z/data=!3m1!4b1!4m4!3m3!8m2!3d16.054412!4d108.202231';
const pinCoords = parseCoordinates(pinUrl);
assert('Exact pin parsed over viewport', pinCoords !== null && pinCoords[0] === 108.202231 && pinCoords[1] === 16.054412);

// 3. Viewport @lat,lng
const viewUrl = 'https://www.google.com/maps/@16.054412,108.202231,17z';
const viewCoords = parseCoordinates(viewUrl);
assert('Viewport coords parsed', viewCoords !== null && viewCoords[0] === 108.202231 && viewCoords[1] === 16.054412);

// 4. Query param
const queryUrl = 'https://www.google.com/maps/search/?api=1&query=16.054412,108.202231';
const queryCoords = parseCoordinates(queryUrl);
assert('Query param parsed', queryCoords !== null && queryCoords[0] === 108.202231 && queryCoords[1] === 16.054412);

// 5. Plus code decoding
const plusDecoded = decodePlusCode('7P8C36FF+WH');
assert('Plus Code decoded to Da Nang', plusDecoded !== null && isValidDanangCoordinates(plusDecoded[0], plusDecoded[1]));
const shortPlus = decodePlusCode('36FF+WH');
assert('Short Plus Code with Da Nang context', shortPlus !== null && isValidDanangCoordinates(shortPlus[0], shortPlus[1]));
// Story 19.5: phía Nam vĩ tuyến 16° (ô 7P7C) — FPT City, Hội An
const fptCity = decodePlusCode('X7H4+5W');
assert('Short Plus Code south of 16°N (FPT City)', fptCity !== null && fptCity[1] < 16 && isValidDanangCoordinates(fptCity[0], fptCity[1]));
const hoiAn = decodePlusCode('V8JQ+25');
assert('Short Plus Code south of 16°N (Hội An)', hoiAn !== null && hoiAn[1] < 15.9 && isValidDanangCoordinates(hoiAn[0], hoiAn[1]));

// 6. Geofence checking
assert('Da Nang coordinate accepted', isValidDanangCoordinates(108.2022, 16.0544));
assert('Hanoi coordinate rejected', !isValidDanangCoordinates(105.8542, 21.0285));
assert('Saigon coordinate rejected', !isValidDanangCoordinates(106.6297, 10.8231));

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
