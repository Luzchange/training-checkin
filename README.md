# Training Check-In

A production-quality, privacy-first, mobile-oriented web application designed to replace paper training sign-in sheets at mass training events by scanning the FRONT barcode of a Common Access Card (CAC) or using manual entry fallback.

---

## ⚠️ Important Compliance & Organizational Notice

> **"Use only where authorized by your organization. This tool records attendance; it does NOT authenticate a CAC or verify identity."**

* **Not DoD Approved:** This software has not been certified, endorsed, or approved by the Department of Defense (DoD), Defense Manpower Data Center (DMDC), or any federal agency.
* **Not an Authentication System:** Scanning a card's front barcode extracts plain visual text layout data for roster logging only. It does not perform public key infrastructure (PKI) cryptographic handshakes or smart-card chip verification.
* **Hosting Metadata Caveat:** Commercial or public static hosting providers (such as GitHub Pages or Vercel) process ordinary web request metadata (e.g., client IP addresses, User-Agent strings, access timestamps) in web server access logs when delivering the static HTML/JS bundle. However, attendance records, names, camera frames, and barcode payloads are processed strictly client-side on your device and are never sent to any hosting provider or external server.

---

## 🛡️ Essential Privacy & Security Boundaries

### Exact Privacy Copy
> *“Camera images and attendance records are processed locally by this app. Exporting or sharing a file sends information outside the app through the destination you choose.”*

### Boundaries Enforced:
1. **Device-Only Processing:** Zero backend, zero cloud database, zero telemetry, zero analytics, zero external CDNs or web fonts.
2. **Never Stored:**
   * Card photographs or camera frames (held transiently in memory only while decoding a frame).
   * Raw barcode payload strings (parsed immediately in memory into approved fields and discarded).
   * Full card identifiers, Social Security Numbers (SSN), DoD ID / EDIPI numbers, birth dates, or card serial numbers.
3. **Minimum Data Retention:**
   * Attendee records contain only: Application-generated Record ID (UUID v4), Display Name (e.g., `DOE, JOHN A`), Check-in Timestamp (ISO 8601 with timezone), Entry Method (`scan` or `manual`), and Session ID.
   * Unit/Branch is optional and only retained if explicitly enabled by the event organizer.
4. **Memory-First Default:**
   * Attendance records default to in-memory state. Closing or reloading the browser page clears session data unless the organizer explicitly chooses *"Save this session on this device"*.
   * If local persistence is enabled, browser `localStorage` is used with a configurable automatic retention expiration (12h, 24h, 72h, or 7 days) and is purged automatically on startup.
5. **Spreadsheet Formula Injection Defense:**
   * CSV export neutralizes formula injection by sanitizing all fields starting with `=`, `+`, `-`, `@`, or control tabs/newlines (prepending single quotes `'`).
   * Filenames are generated with session date and session ID only, never containing attendee names or sensitive personal details.
6. **Strict Content Security Policy (CSP):**
   * Configured in `index.html` preventing outbound network calls (`connect-src 'self'`).

---

## 🔍 Barcode Symbology & Parser Specifications

### The Front Barcode (PDF417) vs. Back Barcode (Code 39)
* **Front Barcode (Supported):** A stacked 2D **PDF417** barcode containing structured alphanumeric text.
  * **Supported Format:** DoD ID Barcode Specification (Version 1 & Version N layout, 88 to 89 characters), documented in public DMDC / DoD ID Bar Code SDK Formats.
  * **Retained Fields:** Cardholder Name (First Name chars 14–33, Last Name chars 34–59, Middle Initial char 88 if Version N).
  * **Discarded Fields:** PDI (chars 1–6), PDT (char 7), EDIPI / DoD ID (chars 8–13), Date of Birth, Expiration, and Card Serial.
* **Back Barcode (Not Supported for Names):** The linear 1D **Code 39** barcode on the back of the card typically encodes only an EDIPI/personnel number and does not contain the cardholder's name. Operators are instructed to scan the front barcode.
* **Uncertainty & Fallback:** Variations in newer CAC formats, NextGen cards, or damaged barcodes fail safely with a notification: *"Barcode format not recognized as a verified front CAC barcode. Please use manual entry."* Guessed parsing is never passed off as verified.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.x or later)
- npm or pnpm

### Local Installation & Setup

```bash
# Clone the repository and enter the directory
cd training-checkin

# Install dependencies (ZXing, React, Lucide icons, Vitest)
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Running Automated Tests

```bash
# Run Vitest test suite
npm test
```

Tests cover:
- Synthetic 88/89-character CAC front barcode parsing
- Unsupported format rejection and oversized payload safety rejection
- PII non-retention and raw payload discarding
- CSV formula injection protection (`=`, `+`, `-`, `@`) and RFC 4180 escaping
- Memory-only defaults, persistence opt-in, retention expiration purge, and data deletion
- UI components (duplicate warning, manual fallback, search filter, edit/delete)

### Production Build

```bash
npm run build
```

The compiled static assets are generated in `dist/`.

---

## 📱 Native Android APK Build

The application is bundled into a native Android APK using Capacitor and Gradle.

### Built APK Location:
- [`training-checkin.apk`](file:///C:/Users/mgaku/Documents/antigravity/training-checkin/training-checkin.apk) (Root directory, ~5.0 MB)
- Original build output: `android/app/build/outputs/apk/debug/app-debug.apk`

### Native Android Permissions (`AndroidManifest.xml`):
- `android.permission.CAMERA`: Hardware camera capture for front barcode scanning
- `android.permission.VIBRATE`: Haptic confirmation on successful scan
- `android.hardware.camera.flash`: Torch toggle support in low-light environments

### How to Rebuild the APK:
```bash
# In the training-checkin directory:
npm run build:apk
```

Or step-by-step:
```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

### Installing on Device:
```bash
# Connect Android phone via USB with USB Debugging enabled:
adb install -r training-checkin.apk
```
Or transfer `training-checkin.apk` directly to your phone via USB/drive and tap to install (enable "Install unknown apps" in Android settings if prompted).

---

## 🌐 Deployment Instructions

### GitHub Pages
1. In `vite.config.ts`, `base: './'` is configured to ensure relative asset paths.
2. Push your repository to GitHub.
3. In GitHub repository settings: **Settings** > **Pages** > **Build and deployment**.
4. Choose **GitHub Actions** and use the standard static Vite deployment workflow, or deploy the `dist/` directory directly to the `gh-pages` branch.

### Vercel
1. Install the Vercel CLI (`npm i -g vercel`) or link via the Vercel Web Dashboard.
2. Build command: `npm run build`
3. Output directory: `dist`
4. The application is completely static and client-side.

---

## 📱 Device Testing Checklist

| Test Item | iPhone (Safari iOS 16+) | Android (Chrome 115+) | Desktop (Chrome/Firefox/Safari) |
| :--- | :---: | :---: | :---: |
| **Camera Permission Prompt** | Verified intentional prompt | Verified intentional prompt | Verified intentional prompt |
| **Rear Camera Preference** | Selects back camera | Selects environment lens | Defaults to webcam |
| **Camera Flip / Switching** | Multi-lens toggle | Multi-lens toggle | Switch devices if >1 |
| **Torch / Flashlight** | Supported on back track | Supported on back track | Disabled when unsupported |
| **Screen Backgrounding** | Camera track stops cleanly | Camera track stops cleanly | Tab switch stops tracks |
| **Scan Debouncing** | 3s hold debounce | 3s hold debounce | 3s hold debounce |
| **Duplicate Warning** | Banner + Keep/Add choice | Banner + Keep/Add choice | Banner + Keep/Add choice |
| **Manual Entry Fallback** | Instant touch form | Instant touch form | Full keyboard support |
| **Web Share API (CSV)** | Native iOS Share Sheet | Android Intent Picker | Fallback to direct download |
| **Print / PDF View** | Clean black & white print | Clean black & white print | Clean print view with sig lines |
| **High-Contrast Dark Mode**| Auto & manual toggle | Auto & manual toggle | Auto & manual toggle |
| **Screen Readers** | VoiceOver ARIA labels | TalkBack ARIA labels | NVDA / VoiceOver tested |

---

## 📄 License
MIT License. Provided for local attendance tracking workflows. Always follow local security and information protection guidelines.

