import 'package:flutter/material.dart';

import '../config/env.dart';
import '../services/next_js_api.dart';

class ChatMessage {
  ChatMessage({required this.role, required this.text});
  final String role;
  final String text;
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  bool _pending = false;
  String? _error;

  Future<void> _send() async {
    final origin = Env.dashboardOrigin;
    if (origin == null) {
      setState(() => _error = 'Set DASHBOARD_API_BASE to use chat.');
      return;
    }

    final text = _controller.text.trim();
    if (text.isEmpty || _pending) return;

    setState(() {
      _messages.add(ChatMessage(role: 'user', text: text));
      _controller.clear();
      _pending = true;
      _error = null;
    });

    try {
      final api = NextJsApi(origin);
      final payload = _messages
          .map((m) => {'role': m.role == 'model' ? 'model' : 'user', 'text': m.text})
          .toList();
      final reply = await api.postChat(messages: payload, context: '');
      if (mounted) {
        setState(() => _messages.add(ChatMessage(role: 'model', text: reply)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('SEMP assistant')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_pending ? 1 : 0),
              itemBuilder: (context, i) {
                if (_pending && i == _messages.length) {
                  return const ListTile(title: Text('…', style: TextStyle(color: Colors.grey)));
                }
                final m = _messages[i];
                final isUser = m.role == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Theme.of(context).colorScheme.surfaceVariant,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(m.text),
                  ),
                );
              },
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Ask about sensors…',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(onPressed: _pending ? null : _send, child: const Text('Send')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
