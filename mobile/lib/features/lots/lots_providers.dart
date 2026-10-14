import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/models.dart';

final lotSearchProvider = FutureProvider.autoDispose.family<List<Lot>, String>((ref, query) async {
  final res = await ref.read(dioProvider).get(
    '/lots',
    queryParameters: {if (query.isNotEmpty) 'q': query},
  );
  return (res.data['data'] as List).map((e) => Lot.fromJson(e as Map<String, dynamic>)).toList();
});

final lotDetailProvider = FutureProvider.autoDispose.family<Lot, String>((ref, id) async {
  final res = await ref.read(dioProvider).get('/lots/$id');
  final data = res.data['data'] as Map<String, dynamic>;
  // Detail endpoint returns a slot list; derive availability counts from it.
  final slots = (data['slots'] as List).cast<Map<String, dynamic>>();
  int count(String t) => slots.where((s) => s['vehicleType'] == t).length;
  return Lot.fromJson({
    ...data,
    'availableSlots': {
      'TWO_WHEELER': count('TWO_WHEELER'),
      'FOUR_WHEELER': count('FOUR_WHEELER'),
    },
  });
});

final myBookingsProvider = FutureProvider.autoDispose<List<Booking>>((ref) async {
  final res = await ref.read(dioProvider).get('/bookings/mine');
  return (res.data['data'] as List).map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList();
});
