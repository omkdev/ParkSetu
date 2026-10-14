import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/models.dart';

class AuthController extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token == null) return null;
    try {
      final res = await ref.read(dioProvider).get('/auth/me');
      return AppUser.fromJson(res.data['data']['user']);
    } on DioException catch (e) {
      // Only drop the session when the server rejected the token;
      // keep it when we're merely offline.
      if (e.response?.statusCode == 401) await ref.read(tokenStoreProvider).clear();
      return null;
    }
  }

  Future<void> _authenticate(String path, Map<String, dynamic> body) async {
    final res = await ref.read(dioProvider).post(path, data: body);
    await ref.read(tokenStoreProvider).write(res.data['data']['token'] as String);
    state = AsyncData(AppUser.fromJson(res.data['data']['user']));
  }

  Future<void> login(String email, String password) =>
      _authenticate('/auth/login', {'email': email, 'password': password});

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String role = 'DRIVER',
  }) =>
      _authenticate('/auth/register', {
        'name': name,
        'email': email,
        'password': password,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        'role': role,
      });

  Future<void> logout() async {
    await ref.read(tokenStoreProvider).clear();
    state = const AsyncData(null);
  }
}

final authProvider =
    AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);
