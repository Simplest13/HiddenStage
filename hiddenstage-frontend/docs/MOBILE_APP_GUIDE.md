# HiddenStage Mobile Application Guide (Capacitor)

This guide documents the mobile application setup, build workflow, and store submission requirements for HiddenStage Android and iOS apps using Capacitor.

---

## 1. Architecture Overview

- **Core Framework**: React 19 + TypeScript + Vite.
- **Mobile Container**: Capacitor 8 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`).
- **Application ID / Package**: `in.hiddenstage.app`
- **Application Name**: `HiddenStage`
- **Native Android Project**: `hiddenstage-frontend/android/`
- **Native iOS Project**: `hiddenstage-frontend/ios/`
- **Web Build Output**: `hiddenstage-frontend/dist/`

---

## 2. Prerequisites

### Common
- Node.js (v20+ or v22 LTS)
- npm (v10+)

### Android Development
- Android Studio Ladybug (or newer)
- Android SDK (API 34 / 35) & Build Tools
- Java Development Kit (JDK 17 or JDK 21)

### iOS Development (macOS only)
- macOS Sequoia (or newer)
- Xcode 15+ (with iOS 17+ SDK and command line tools)
- CocoaPods / Swift Package Manager (Capacitor 8 uses SPM / native integration)

---

## 3. Development & Build Commands

All commands are run from the `hiddenstage-frontend` directory:

```bash
# 1. Typecheck and build web assets, then sync to native platforms
npm run cap:build

# 2. Sync web assets only without rebuilding (after manual build)
npm run cap:sync

# 3. Open Android project in Android Studio
npm run cap:android

# 4. Open iOS project in Xcode (macOS only)
npm run cap:ios
```

---

## 4. Production Android Build & Google Play Submission

### Step 1: Generate Release Keystore
If you do not already have a release keystore, generate one using `keytool`:

```bash
keytool -genkey -v -keystore hiddenstage-release.keystore -alias hiddenstage -keyalg RSA -keysize 2048 -validity 10000
```
Keep this keystore file and credentials secure and backed up.

### Step 2: Configure Signing in `android/app/build.gradle`
Create or update `android/key.properties` (do not commit to public version control):
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=hiddenstage
storeFile=../hiddenstage-release.keystore
```

In `android/app/build.gradle`:
```groovy
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('storeFile')) {
                storeFile file(project.property('storeFile'))
                storePassword project.property('storePassword')
                keyAlias project.property('keyAlias')
                keyPassword project.property('keyPassword')
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Android App Bundle (.aab)
Google Play requires App Bundles (.aab) for new app submissions:

```bash
cd android
./gradlew bundleRelease
```
The generated bundle will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

For a standalone test APK:
```bash
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Step 4: Google Play Console Submission Checklist
- **Target API Level**: Target Android 14 (API level 34) or higher.
- **Privacy Policy**: Public URL disclosing data collection (auth, profile, contact).
- **Permissions Declared in `AndroidManifest.xml`**:
  - `CAMERA`: Provider profile avatar upload and portfolio media capture.
  - `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`: Portfolio file selection.
  - `POST_NOTIFICATIONS`: Booking and message push notifications.
- **Data Safety Form**:
  - Personal info: Name, email address, phone number (for booking contact).
  - Photos/Videos: Portfolio uploads by service providers.
  - Financial info: Quotation amounts (no direct in-app card storage; handled by gateway).
- **App Content & Rating**:
  - Complete the IARC rating questionnaire.
  - Target audience declaration (18+ / General marketplace).

---

## 5. Production iOS Build & App Store Submission

### Step 1: Apple Developer Account & App ID
1. Log in to [developer.apple.com](https://developer.apple.com).
2. Create an App ID with identifier `in.hiddenstage.app`.
3. Enable Push Notifications capability if push notifications are required.

### Step 2: Configure Xcode Project
```bash
npm run cap:ios
```
1. In Xcode, select the `App` target.
2. Under **Signing & Capabilities**:
   - Check **Automatically manage signing**.
   - Select your Apple Developer Team.
   - Verify Bundle Identifier is `in.hiddenstage.app`.
3. Verify `Info.plist` usage descriptions (already configured):
   - `NSCameraUsageDescription`: "HiddenStage requires camera access to take profile and portfolio photos."
   - `NSPhotoLibraryUsageDescription`: "HiddenStage requires photo library access to upload portfolio media."
   - `NSPhotoLibraryAddUsageDescription`: "HiddenStage requires access to save media to your library."

### Step 3: Archive and Upload
1. In Xcode menu: **Product** > **Destination** > **Any iOS Device (arm64)**.
2. In Xcode menu: **Product** > **Archive**.
3. Once the Organizer opens:
   - Click **Distribute App**.
   - Select **App Store Connect**.
   - Choose **Upload** and proceed with default signing and validation.

### Step 4: App Store Connect Submission Checklist
- **App Name**: HiddenStage
- **Primary Category**: Business or Lifestyle.
- **Keywords**: events, wedding planning, catering, photographers, entertainment.
- **Support & Privacy Policy URL**: Hosted link to live privacy statement.
- **App Review Information**:
  - Demo login credentials for reviewer (Customer account and Provider account).
  - Notes explaining service provider portfolio and customer booking flow.
- **App Privacy Details**:
  - Complete "App Privacy" questionnaire detailing Contact Info (Name, Email, Phone), User Content (Photos/Videos).

---

## 6. Environment & API Configuration for Production

Before building production mobile binaries:
1. Ensure `VITE_API_BASE_URL` in `.env.production` points to your live backend endpoint (e.g. `https://api.hiddenstage.in`).
2. Verify SSL/TLS is properly installed on the production domain.
3. Confirm CORS origins on the Django backend allow `https://localhost` (Capacitor Android default origin) and `capacitor://localhost` (iOS default origin).

---

## 7. Verification Summary

- **Backend Test Suite**: 176 tests passing (100% green).
- **Frontend Typecheck**: TypeScript clean (`tsc -b`).
- **Frontend Test Suite**: 37 tests passing (100% green).
- **Capacitor Sync Status**: Verified clean sync across Android and iOS projects.
