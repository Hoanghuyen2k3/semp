import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'chat_screen.dart';
import 'dashboard_tab.dart';
import 'plant_health_tab.dart';
import 'settings_tab.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  final _dashKey = GlobalKey<DashboardTabState>();

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Eco-Monitoring'),
        actions: [
          if (_index == 0)
            IconButton(
              icon: const Icon(Icons.chat_bubble_outline),
              tooltip: 'Assistant',
              onPressed: () {
                Navigator.of(context).push<void>(
                  MaterialPageRoute<void>(builder: (_) => const ChatScreen()),
                );
              },
            ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'out') _signOut();
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'out', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          DashboardTab(key: _dashKey),
          const PlantHealthTab(),
          const SettingsTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          setState(() => _index = i);
          if (i == 0) _dashKey.currentState?.refresh();
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.eco_outlined), selectedIcon: Icon(Icons.eco), label: 'Plant health'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
        ],
      ),
    );
  }
}
