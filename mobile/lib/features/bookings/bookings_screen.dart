import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../auth/auth_controller.dart';
import '../lots/lots_providers.dart';

class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  Future<void> _cancel(BuildContext context, WidgetRef ref, Booking b) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel booking?'),
        content: Text('${b.lotName} · slot ${b.slotLabel}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Cancel booking')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(dioProvider).post('/bookings/${b.id}/cancel');
      ref.invalidate(myBookingsProvider);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookings = ref.watch(myBookingsProvider);
    final fmt = DateFormat('d MMM, h:mm a');
    return Scaffold(
      appBar: AppBar(
        title: const Text('My bookings'),
        actions: [
          IconButton(
            tooltip: 'Log out',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: bookings.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(errorMessage(e))),
        data: (items) => items.isEmpty
            ? const Center(child: Text('No bookings yet'))
            : RefreshIndicator(
                onRefresh: () async => ref.refresh(myBookingsProvider.future),
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: items.length,
                  itemBuilder: (_, i) {
                    final b = items[i];
                    return Card(
                      child: ListTile(
                        title: Text('${b.lotName} · ${b.slotLabel}'),
                        subtitle: Text('${b.vehicleType.label} · ${b.vehicleNumber}\n'
                            '${fmt.format(b.startTime)} → ${fmt.format(b.endTime)}\n'
                            '₹${b.totalAmount.toStringAsFixed(0)} · ${b.status.toLowerCase()}'),
                        isThreeLine: true,
                        trailing: b.canCancel
                            ? IconButton(
                                tooltip: 'Cancel',
                                icon: const Icon(Icons.cancel_outlined),
                                onPressed: () => _cancel(context, ref, b),
                              )
                            : null,
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}
