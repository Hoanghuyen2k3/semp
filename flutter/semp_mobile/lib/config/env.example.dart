/// Template for local `env.dart` (that file is gitignored).
///
/// 1. Copy this file to `env.dart` in the same folder:
///    `copy lib\config\env.example.dart lib\config\env.dart` (Windows)
/// 2. Fill in [defaultValue:] strings **or** rely only on `--dart-define=...` at build time.
///
/// Run example:
/// `flutter run --dart-define=SUPABASE_URL=https://xxx.supabase.co --dart-define=SUPABASE_ANON_KEY=eyJ...`
///
/// Optional (weather, chat, plant health via your deployed Next.js app):
/// `--dart-define=DASHBOARD_API_BASE=https://your-app.vercel.app`
class Env {
  Env._();

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');
  static const dashboardApiBase = String.fromEnvironment('DASHBOARD_API_BASE', defaultValue: '');

  static bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  static String? get dashboardOrigin {
    final b = dashboardApiBase.trim();
    if (b.isEmpty) return null;
    return b.endsWith('/') ? b.substring(0, b.length - 1) : b;
  }
}
