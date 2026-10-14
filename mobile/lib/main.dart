import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'features/auth/auth_controller.dart';
import 'router.dart';

void main() {
  runApp(const ProviderScope(child: ParkSetuApp()));
}

class ParkSetuApp extends ConsumerWidget {
  const ParkSetuApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final theme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
    );

    // Show a splash while the stored session is being restored.
    if (auth.isLoading) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme,
        home: const Scaffold(body: Center(child: CircularProgressIndicator())),
      );
    }

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'ParkSetu',
      theme: theme,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
