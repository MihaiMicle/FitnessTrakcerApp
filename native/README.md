# Native shell

Everything needed to turn the web app into an App Store and Play Store build,
and to give it real Apple Health and Health Connect access.

Nothing in this folder is part of the web build. It is copied into the
frontend when you scaffold the native project.

## Why the web app cannot do this on its own

There is no browser API for either store, and there is no cloud API that
substitutes for one:

| Store | Reachable from | Notes |
|---|---|---|
| Apple HealthKit | iOS app only | No web API, no server API, at all |
| Android Health Connect | Android app only | On-device. Only exposes the 30 days before permission was granted |
| Google Fit REST API | — | Closed to new developers since 1 May 2024, retired end of 2026 |
| Google Health API | Server to server | Fitbit and Google account data, separate onboarding, not the phone's store |

So the browser gets the **file import** path, and the packaged app gets the
**direct sync** path. Both write through the same `/health/sync` endpoint and
produce identical rows, which is the whole point of the design: importing the
export today and connecting the phone next month does not create two copies of
anything.

## 1. Add Capacitor

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
cp ../native/capacitor.config.ts ./capacitor.config.ts
```

Add the build scripts to `frontend/package.json`:

```json
"build:native": "BUILD_TARGET=native next build",
"sync:native": "npm run build:native && npx cap sync",
"open:ios": "npx cap open ios",
"open:android": "npx cap open android"
```

`BUILD_TARGET=native` switches `next.config.ts` to `output: 'export'`. A
packaged build has no Node server, so anything relying on server rendering,
route handlers or image optimisation will not work there. The app is client
rendered throughout today, so this is a config change rather than a rewrite,
but keep it that way — a server component added later breaks only the store
build, and only at `cap sync` time.

Set `NEXT_PUBLIC_API_URL` to the deployed backend before building. A packaged
app has no localhost to fall back to.

```bash
npm run build:native
npx cap add ios
npx cap add android
```

## 2. Build the health plugin

The web app looks for a Capacitor plugin registered as
**`FitnessTrackerHealth`**. Capacitor publishes a registered plugin at
`window.Capacitor.Plugins.FitnessTrackerHealth` on its own, so there is no
wiring to do on the web side once it exists.

`plugin-contract.ts` is the interface it has to satisfy — four methods, with
the per-platform gotchas written into the comments. Copy it into the plugin
package as its `definitions.ts`.

```bash
npm init @capacitor/plugin@latest
# name: fitness-tracker-health, class: FitnessTrackerHealth
```

You have two reasonable routes:

- **Wrap an existing plugin.** A cross-platform health plugin covering both
  stores through one typed API (around 20 data types, aggregation buckets and
  workout reads) is much less work than writing HealthKit and Health Connect
  bindings twice. Your plugin then becomes a thin mapping layer onto the
  contract, which is where you want your own code anyway.
- **Write it directly.** `HKHealthStore` + `HKSampleQuery` on iOS,
  `HealthConnectClient.readRecords` on Android.

Either way, three things are not optional:

1. **Send `external_id`.** `HKObject.uuid` on iOS, `record.metadata.id` on
   Android. Without it the server hashes the sample's contents to get an id,
   which works but treats a corrected record as a new one.
2. **Send `source`** as the writing app's display name, and filter out records
   whose source is this app before returning them. Otherwise a workout the app
   pushed into Apple Health comes back on the next read and is counted twice.
   The server drops them as a second line of defence, but doing it on the
   device saves the round trip.
3. **Write under the source name `FitnessTracker`.** That string is what both
   filters key on. It is `SELF_SOURCE_NAME` in `lib/health/normalize.ts` and
   `backend/core/health.py`, and changing it means changing all three.

### iOS

`ios/App/App/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Reads your weight, steps and sleep so your training and nutrition sit alongside the rest of your health data.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Writes the workouts and meals you log here into Apple Health.</string>
```

Turn on the HealthKit capability in Xcode. App Review rejects builds that ask
for HealthKit without both strings, and rejects vague ones — say what you read
and why.

HealthKit never reports whether a read permission was denied. That is
deliberate: the refusal would itself leak health information. So
`requestPermissions` returns granted once the sheet has been shown, and a
denied metric shows up as an empty read. The panel handles that by reporting
what actually arrived rather than claiming success.

### Android

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.health.READ_WEIGHT"/>
<uses-permission android:name="android.permission.health.READ_BODY_FAT"/>
<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED"/>
<uses-permission android:name="android.permission.health.READ_SLEEP"/>
<uses-permission android:name="android.permission.health.READ_EXERCISE"/>
<uses-permission android:name="android.permission.health.READ_DISTANCE"/>
<uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
<uses-permission android:name="android.permission.health.READ_HYDRATION"/>
<uses-permission android:name="android.permission.health.READ_NUTRITION"/>

<uses-permission android:name="android.permission.health.WRITE_WEIGHT"/>
<uses-permission android:name="android.permission.health.WRITE_EXERCISE"/>
<uses-permission android:name="android.permission.health.WRITE_HYDRATION"/>
<uses-permission android:name="android.permission.health.WRITE_NUTRITION"/>
```

Plus the rationale activity, which Play Store review checks for:

```xml
<activity android:name=".PermissionsRationaleActivity" android:exported="true">
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"/>
  </intent-filter>
</activity>
```

`minSdkVersion 28`. Health Connect ships with the system on Android 14 and
later; on 9 to 13 the user may have to install it first, which is what
`isAvailable` should report.

Only request the permissions you actually read. Play Store review rejects
health permission requests that the app's described functionality does not
justify, and every unused one is a question you will have to answer.

## 3. What you get

Once the plugin exists, nothing else changes. `lib/health/bridge.ts` finds it,
`getCapabilities()` starts returning `canSync: true`, and the same
`HealthSyncPanel` that shows the file upload in a browser shows a Connect
button in the app.

## Store review notes

- **Apple**: HealthKit data cannot be used for advertising, and cannot be
  shared with third parties without explicit consent. It also may not be
  written to iCloud. None of that is a problem here — the data goes to your own
  backend — but the privacy policy has to say so, and the App Privacy card has
  to declare health data collection.
- **Google Play**: Health Connect access needs the declaration form filled in,
  and the permissions have to match what the app visibly does.
- **Both**: disconnecting has to actually delete. It does —
  `DELETE /health/connections/{provider}` purges every sample that provider
  contributed and leaves the numbers the user typed alone. That separation is
  why samples are stored raw per provider rather than folded straight into the
  weight log.
