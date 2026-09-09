# LifeLingo Android release path

## Available immediately: installable Android app (PWA)

LifeLingo is now an installable Progressive Web App. On Android Chrome, visiting the deployed site presents an **Install LifeLingo** action when the browser makes the install prompt available. The installed app opens in its own window, has a real launcher icon, and does not need an APK download.

The PWA is the correct first release path while the product is still evolving: updates are deployed once and reach users without requiring a new APK submission.

## Required before Google Play publication

Google Play publishing needs an Android App Bundle (`.aab`), a signed package identity, a Play Console developer account, and a verified web origin for the Trusted Web Activity wrapper. GitHub Pages under a project path cannot host the required Digital Asset Links file at the origin root, so the production app must use a domain controlled by LifeLingo (for example `lifelingo.app`) before this step.

The release owner needs to:

1. Create/verify the Google Play Console developer account and accept its legal/payment terms.
2. Decide the final Android application id (recommended: `app.lifelingo.mobile`). It cannot be changed after the first production release.
3. Point the LifeLingo domain to the final production deployment and keep HTTPS enabled.
4. Provide the Android signing/upload-key choice through the Play Console flow. Do not send passwords or keys in chat.
5. Complete Play Console declarations: app category, content rating, Data safety, privacy policy URL, store listing, screenshots, and test-track testers.

After those account/domain steps, the repository can add the Trusted Web Activity Android wrapper, publish `/.well-known/assetlinks.json` on the production domain, build the signed `.aab`, and upload it first to Internal testing.

## Privacy notes for the Play listing

LifeLingo uses authentication, learner progress, optional profile information, and microphone access for speaking where supported. The final Data safety form and privacy policy must describe the data that is actually collected in production. Raw microphone recordings must not be declared as stored unless that behavior is deliberately implemented later.
