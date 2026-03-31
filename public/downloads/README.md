# Downloads folder

Place public downloadable files here so Vite serves them at `/downloads/...`.

## Android APK (`dokanyar.apk`)

The app links to `dokanyar.apk` from `WelcomeDownloadPage`.

After a successful debug build, copy the artifact:

```powershell
# from repo root, after: npm run android:debug
mkdir -Force public\downloads
Copy-Item -Force android\app\build\outputs\apk\debug\app-debug.apk public\downloads\dokanyar.apk
```

### Requirements (Windows)

- **JDK 17** (or the version required by your Android Gradle Plugin), with `JAVA_HOME` set and `java` on `PATH`.
- **Android SDK** (install via Android Studio), with `ANDROID_HOME` set.
- Then run: `npm run android:debug`

## Windows installer (optional)

`Dokanyar-Setup.exe` — add here when you have a built installer.
