import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _tokenKey = 'parksetu_token';

/// Override with `--dart-define=API_URL=https://your-host/api`.
String get apiBaseUrl {
  const fromEnv = String.fromEnvironment('API_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  // Android emulator reaches the host machine through 10.0.2.2.
  if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:5000/api';
  return 'http://localhost:5000/api';
}

class TokenStore {
  Future<String?> read() async =>
      (await SharedPreferences.getInstance()).getString(_tokenKey);

  Future<void> write(String token) async =>
      (await SharedPreferences.getInstance()).setString(_tokenKey, token);

  Future<void> clear() async =>
      (await SharedPreferences.getInstance()).remove(_tokenKey);
}

final tokenStoreProvider = Provider<TokenStore>((_) => TokenStore());

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ));
  dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }));
  return dio;
});

/// Human friendly message from a failed request.
String errorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final errors = data['errors'];
      if (errors is List && errors.isNotEmpty) {
        return errors.map((e) => '${e['path']}: ${e['message']}').join(', ');
      }
      if (data['message'] is String) return data['message'] as String;
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return 'Cannot reach the server. Check your connection.';
    }
    return error.message ?? 'Request failed';
  }
  return error.toString();
}
