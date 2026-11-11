# Genesis AI Examiner V3 — iPhone PWA

Genesis Academy branded, installable, offline-first Progressive Web App for CBSE Classes 6–10, Mathematics and Science.

## Included
- Responsive iPhone-friendly interface and Add to Home Screen manifest.
- Service worker caches the app shell for offline relaunch after the first successful online visit.
- IndexedDB stores question papers, assessments and imported file blobs locally in the browser.
- Question-paper file intake (PDF/image) for local reference.
- Answer sheet photo/camera and PDF intake for local reference.
- Manual answer transcription/correction per question.
- Criterion-wise rubric matching and partial mark suggestions, with mark caps.
- Teacher mark override, class averages, highest/lowest and common improvement themes.
- Printable individual student report (Save as PDF from iOS print/share UI).

## Honest capability limits
This PWA does NOT include handwriting OCR, scanned-PDF OCR, a trained offline LLM, computer-vision diagram evaluation or symbolic maths reasoning. Browser-based image intake is not the same as OCR. The evaluator works on teacher-transcribed answer text and uses explainable rubric/keyword rules. Confidence is a heuristic indicator, not a calibrated probability. Teacher review is mandatory. Do not use the suggestions as final CBSE marks without checking the original answer and marking scheme.

## Publish to GitHub Pages (no Mac required)
You can do this from the GitHub website on your iPhone.

1. Sign in to GitHub in Safari and create a **public repository** named `genesis-ai-examiner`.
2. Open the repository and choose **Add file → Upload files**.
3. Upload the contents of this folder (not the ZIP itself): `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `icons/`, and `README.md`.
4. Commit the files to the `main` branch.
5. Open repository **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select branch `main` and folder `/ (root)`, then Save.
8. Wait for GitHub Pages to publish. The address will be `https://YOUR-GITHUB-USERNAME.github.io/genesis-ai-examiner/`.
9. Open that URL in Safari on iPhone. Wait until the app has loaded once while online.
10. Tap Safari **Share → Add to Home Screen → Add**.
11. Launch Genesis Examiner from the iPhone Home Screen. Open it once online before using it offline.

GitHub Pages uses HTTPS, which is required for service workers and installable PWAs.

## Updating
Upload changed files to the same repository and commit. Reopen the hosted app online so the service worker can refresh its cached shell.

## Data / backup warning
IndexedDB data is stored in the browser's local site storage on that iPhone. Clearing Safari website data, removing site data or browser storage eviction can delete records. Export/backup and restore are not included in this version. Do not treat this as a secure school records system until access control, backup, encryption and retention policies are implemented.

## Privacy
The app contains no analytics, ads, cloud database or third-party runtime library. Student data and imported files remain in local browser storage. GitHub Pages only hosts the static app source.
