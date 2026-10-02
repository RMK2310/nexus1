import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'core/state.dart';
import 'screens/login_page.dart';
import 'screens/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  final state = AppState();
  await state.boot();

  runApp(
    ChangeNotifierProvider.value(
      value: state,
      child: const NexusApp(),
    ),
  );
}

class NexusApp extends StatelessWidget {
  const NexusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NEXUS — One App. Every Connection.',
      debugShowCheckedModeBanner: false,
      theme: NexusTheme.dark,
      home: const MainGate(),
    );
  }
}

class MainGate extends StatelessWidget {
  const MainGate({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    if (state.booting) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('N',
                  style: TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.w900,
                      color: NexusTheme.primary)),
              SizedBox(height: 18),
              SizedBox(
                  width: 26,
                  height: 26,
                  child: CircularProgressIndicator(strokeWidth: 2.4)),
            ],
          ),
        ),
      );
    }
    if (!state.isAuthenticated) return const LoginPage();
    return const HomeShell();
  }
}
