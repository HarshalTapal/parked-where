# Phase 9: QA and deploy

## 1. Test matrix (plan section 8): what was run on the desktop

Browser: Microsoft Edge 156 driven by Playwright. Location, offline mode and storage failures are
simulated. Nothing below was run on a real phone yet (see section 3).

| Scenario | Result | Evidence |
|---|---|---|
| No saved spot / active spot / 5+ history records | Pass | Empty Home, active Home, 6 past records listed as "Past record", active spot never in the list (audits 3, 6, 10) |
| Location granted / denied / timeout / unavailable | Pass (simulated) | Saves, or falls back to typing the place with "no coordinates" (audit 3) |
| Poor accuracy (over 50 m) | Pass | "Approximate location" at 70, 80, 99 and 120 m (audits 3, 5, 9) |
| Photo / no photo | Pass | Save is never blocked, a bad file is refused with a message, replacing a photo works (audits 4, 6b) |
| Camera denied | Not testable here | The app uses the phone's own camera picker, so the permission prompt belongs to the phone. Check on the phone |
| Network off | Pass | Spot, photo, coordinates and fonts show; map says "Map unavailable offline" (audit 8, production build) |
| Storage failure (simulated) | Pass | Error shown, typed data kept, retry works (audits 2, 3, 4, 6, 7) |
| Save a second spot, Undo | Pass | Previous spot moves to history; Undo restores it (audit 3) |
| Delete a spot | Pass | Confirmation, then an 8 second Undo (audit 6) |
| Directions link blocked | Partly | Coordinates, clues and Copy buttons always sit beside the links and work (audit 5). A link blocked by a real phone or app cannot be simulated |
| Export, delete all, import | Pass | Every field and photo restored byte for byte (unit tests, audit 7) |
| Keyboard / screen reader | Pass for keyboard and labels. Screen reader not tested | Every control on every screen has a name, a visible focus ring, a Tab stop, and the order follows the screen. Modal traps focus, Esc closes it, focus returns (audit 10). No real screen reader (VoiceOver, TalkBack, NVDA) was used |
| Widths 360, 390, 430 and desktop | Pass | No horizontal scroll, centred container on desktop (audits 3 to 10) |
| Every button and tab | Pass | Tab bar marks the current page; no "Not built yet" placeholders left |

Also: 101 unit tests, TypeScript and build clean, lint clean except two accepted warnings.

Found and fixed during Phase 9:

- The map crashed for any GPS fix worse than 60 m (fixed in `dfe8f98`).
- The empty Home screen had no `h1` heading for screen readers.
- Floor chips (G, 1 to 5) were under 44 px wide; the draggable pin was 36 px wide.
- The pin on the Find screen was a keyboard stop that did nothing.

## 2. Deploy to GitHub Pages

Do the steps in this order. Pages must be switched on before the first push.

1. Go to https://github.com and sign in (or create a free account).
2. Top right, click **+**, then **New repository**.
3. Repository name: `parked-where` (any name works; it becomes part of the web address).
4. Choose **Public**. Free accounts can only publish Pages from public repositories.
5. Leave **Add a README**, **.gitignore** and **license** all unticked. Click **Create repository**.
6. On the new repository page click **Settings**, then **Pages** in the left list.
7. Under **Build and deployment**, set **Source** to **GitHub Actions**. Nothing else to click.
8. Open the terminal in this project and run, replacing `YOUR-USERNAME`:
   ```
   git remote add origin https://github.com/YOUR-USERNAME/parked-where.git
   git push -u origin main
   ```
   A browser window may open asking you to sign in to GitHub. Approve it.
9. On the repository page click **Actions**. The run "Deploy to GitHub Pages" takes 1 to 3 minutes.
   Green tick means it is live. A red cross: open it and send me the error text.
10. Open `https://YOUR-USERNAME.github.io/parked-where/`.

Notes:

- The code is public. Your parking data is not, because it never leaves the device.
- Commits carry the author email `tapalharshal@gmail.com`, which becomes visible on a public repository.
  If you do not want that, tell me before step 8 and we will set a GitHub "noreply" address first.
- Every later push to `main` redeploys. Installed apps then show "A new version is ready".

## 3. Phone checklist

Open the deployed address on the phone, then:

1. **Install.** iPhone: Safari, Share, **Add to Home Screen**. Android: Chrome, menu, **Install app**.
2. **Open from the home screen.** It should open full screen with the black pin icon.
3. **Save parking.** Allow location. Watch the accuracy number. You should reach "Add details" with a map.
4. **Compare the pin** with where you really are. Try **Adjust pin on map**.
5. **Photo.** Tap **Take a photo** and check the camera opens (or the photo picker). Save with and without a photo.
6. **Find my vehicle.** The map shows. **Get directions** opens your maps app.
7. **Airplane mode.** Reopen the app. The spot, photo and coordinates show. Find says "Map unavailable offline".
8. **Deny location.** Turn location off for the site, save again, and check you can type the place instead.
9. **History, Reuse, Delete and Undo.** Save a second spot and check the first is in History.
10. **Settings.** Download a backup, then check the location steps match your phone's real menus.
11. **Close and reopen the app a day later.** Check your spot is still there (iPhone can clear browser data
    for sites that are not installed).

Write down anything that looks wrong, with the step number.
