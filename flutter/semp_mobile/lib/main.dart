import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config/env.dart';
import 'screens/main_shell.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (!Env.isConfigured) {
    runApp(const _ConfigMissingApp());
    return;
  }

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  runApp(const SempApp());
}

class SempApp extends StatelessWidget {
  const SempApp({super.key});

  @override
  Widget build(BuildContext context) {
    final dark = ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF58a6ff),
        brightness: Brightness.dark,
        surface: const Color(0xFF1a2332),
      ),
      useMaterial3: true,
    );

    return MaterialApp(
      title: 'SEMP',
      theme: dark,
      home: StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (context, snapshot) {
          final session = snapshot.data?.session;
          if (session != null) return const MainShell();
          return const LoginScreen();
        },
      ),
    );
  }
}

class _ConfigMissingApp extends StatelessWidget {
  const _ConfigMissingApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('SEMP mobile', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
                SizedBox(height: 16),
                Text(
                  'Configure Supabase credentials with dart-define, then restart:\n\n'
                  'flutter run \\\n'
                  '  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \\\n'
                  '  --dart-define=SUPABASE_ANON_KEY=eyJ...\n\n'
                  'Optional (weather + assistant via your deployed dashboard):\n'
                  '  --dart-define=DASHBOARD_API_BASE=https://your-next-app.vercel.app',
                  style: TextStyle(height: 1.4),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
