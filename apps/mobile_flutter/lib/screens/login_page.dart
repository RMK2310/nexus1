import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../core/state.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController(text: 'consumer@nexus.com');
  final _password = TextEditingController(text: 'NexusPass123!');
  bool _loading = false;
  bool _obscure = true;
  String? _error;
  late final AnimationController _glow =
      AnimationController(vsync: this, duration: const Duration(seconds: 3))
        ..repeat(reverse: true);

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _glow.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await context.read<AppState>().login(_email.text.trim(), _password.text);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('ApiException: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.8, -1.0),
            radius: 1.4,
            colors: [Color(0xFF241A5E), NexusTheme.background],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AnimatedBuilder(
                    animation: _glow,
                    builder: (context, _) {
                      return Container(
                        width: 92,
                        height: 92,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: NexusTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(26),
                          boxShadow: [
                            BoxShadow(
                              color: NexusTheme.primary
                                  .withOpacity(0.25 + 0.2 * _glow.value),
                              blurRadius: 40,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Text('N',
                            style: TextStyle(
                                fontSize: 44,
                                fontWeight: FontWeight.w900,
                                color: Colors.white)),
                      );
                    },
                  ),
                  const SizedBox(height: 26),
                  Text('Welcome back',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 8),
                  Text('One app. Every connection. Sign in to continue.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 36),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'Email address',
                      prefixIcon: Icon(Icons.alternate_email,
                          color: NexusTheme.textMuted, size: 20),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline,
                          color: NexusTheme.textMuted, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(
                            _obscure
                                ? Icons.visibility_off_outlined
                                : Icons.visibility_outlined,
                            color: NexusTheme.textMuted,
                            size: 20),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: NexusTheme.danger.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: NexusTheme.danger.withOpacity(0.3)),
                      ),
                      child: Text(_error!,
                          style: const TextStyle(
                              color: NexusTheme.danger, fontSize: 13)),
                    ),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _loading ? null : _submit,
                    style: FilledButton.styleFrom(
                      backgroundColor: NexusTheme.primary,
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.4, color: Colors.white),
                          )
                        : const Text('Sign in'),
                  ),
                  const SizedBox(height: 14),
                  TextButton(
                    onPressed: () => _showRegisterSheet(context),
                    child: const Text('New to NEXUS? Create an account',
                        style: TextStyle(color: NexusTheme.textSecondary)),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: NexusTheme.surface.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Demo: consumer@nexus.com / NexusPass123!\nOther roles: seller@ driver@ restaurant@ admin@nexus.com',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: NexusTheme.textMuted,
                          fontSize: 11.5,
                          height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showRegisterSheet(BuildContext context) {
    final name = TextEditingController();
    final email = TextEditingController();
    final password = TextEditingController();
    bool loading = false;
    String? error;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
              left: 24,
              right: 24,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Create your account',
                  style: Theme.of(ctx).textTheme.headlineMedium),
              const SizedBox(height: 20),
              TextField(
                  controller: name,
                  decoration: const InputDecoration(hintText: 'Full name')),
              const SizedBox(height: 12),
              TextField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  decoration:
                      const InputDecoration(hintText: 'Email address')),
              const SizedBox(height: 12),
              TextField(
                  controller: password,
                  obscureText: true,
                  decoration: const InputDecoration(
                      hintText: 'Password (min 8 chars)')),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(error!,
                      style: const TextStyle(color: NexusTheme.danger)),
                ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: loading
                    ? null
                    : () async {
                        setSheetState(() => loading = true);
                        try {
                          await context.read<AppState>().register(
                              name.text.trim(), email.text.trim(),
                              password.text);
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          setSheetState(() => error = e
                              .toString()
                              .replaceFirst('ApiException: ', ''));
                        }
                      },
                child: loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.2))
                    : const Text('Create account & continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
