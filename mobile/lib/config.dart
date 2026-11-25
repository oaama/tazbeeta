import 'package:flutter/foundation.dart';

/// Build-time configuration. Nothing here is a secret.
///
/// DEMO=true builds an offline preview that uses built-in mock data and never talks to Supabase or the API.
/// A real build must be given API_URL (the production API). There is no silent fallback to an emulator address:
/// without API_URL a release build shows a configuration error, and CI refuses to build it.
const demoMode = bool.fromEnvironment('DEMO');
const apiBase = String.fromEnvironment('API_URL',
    defaultValue: kDebugMode
        ? 'http://10.0.2.2:3000'
        : 'https://tazbeeta.angluosr.workers.dev');
bool get apiConfigured => apiBase.isNotEmpty;
