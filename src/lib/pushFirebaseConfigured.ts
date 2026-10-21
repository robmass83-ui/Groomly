// True only while android/app/google-services.json is part of the Android build.
// register() without that file crashes the process; the JS catch does not run.
export const PUSH_FIREBASE_CONFIGURED = true
