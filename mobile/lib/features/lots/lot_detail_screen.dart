import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import 'lots_providers.dart';

class LotDetailScreen extends ConsumerStatefulWidget {
  const LotDetailScreen({super.key, required this.lotId});

  final String lotId;

  @override
  ConsumerState<LotDetailScreen> createState() => _LotDetailScreenState();
}

class _LotDetailScreenState extends ConsumerState<LotDetailScreen> {
  final _vehicleNumber = TextEditingController();
  final _fmt = DateFormat('d MMM, h:mm a');
  VehicleType _type = VehicleType.fourWheeler;
  DateTime? _start;
  DateTime? _end;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _vehicleNumber.dispose();
    super.dispose();
  }

  Future<DateTime?> _pick(DateTime? initial) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial ?? now,
      firstDate: DateTime(now.year, now.month, now.day),
      lastDate: now.add(const Duration(days: 90)),
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial ?? now.add(const Duration(hours: 1))),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  bool get _validWindow => _start != null && _end != null && _end!.isAfter(_start!);

  int get _hours {
    final mins = _end!.difference(_start!).inMinutes;
    return (mins / 60).ceil().clamp(1, 1 << 30);
  }

  Future<void> _book() async {
    if (_vehicleNumber.text.trim().length < 4) {
      setState(() => _error = 'Enter a valid vehicle number');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(dioProvider).post('/bookings', data: {
        'lotId': widget.lotId,
        'vehicleType': _type.api,
        'vehicleNumber': _vehicleNumber.text.trim(),
        'startTime': _start!.toUtc().toIso8601String(),
        'endTime': _end!.toUtc().toIso8601String(),
      });
      ref.invalidate(myBookingsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking confirmed')));
        context.go('/bookings');
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lot = ref.watch(lotDetailProvider(widget.lotId));
    return Scaffold(
      appBar: AppBar(title: const Text('Parking lot')),
      body: lot.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(errorMessage(e))),
        data: (lot) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(lot.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text('${lot.address}, ${lot.city}'),
            if (lot.description != null) ...[
              const SizedBox(height: 8),
              Text(lot.description!),
            ],
            const SizedBox(height: 20),
            SegmentedButton<VehicleType>(
              segments: [
                for (final t in VehicleType.values)
                  ButtonSegment(
                    value: t,
                    label: Text('${t.label}\n₹${lot.rateFor(t).toStringAsFixed(0)}/hr', textAlign: TextAlign.center),
                  ),
              ],
              selected: {_type},
              onSelectionChanged: (s) => setState(() => _type = s.first),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _vehicleNumber,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(labelText: 'Vehicle number', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.login),
                  label: Text(_start == null ? 'Start time' : _fmt.format(_start!)),
                  onPressed: () async {
                    final v = await _pick(_start);
                    if (v != null) setState(() => _start = v);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.logout),
                  label: Text(_end == null ? 'End time' : _fmt.format(_end!)),
                  onPressed: () async {
                    final v = await _pick(_end ?? _start?.add(const Duration(hours: 1)));
                    if (v != null) setState(() => _end = v);
                  },
                ),
              ),
            ]),
            if (_start != null && _end != null && !_validWindow)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('End time must be after start time',
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            if (_validWindow)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  '$_hours hr × ₹${lot.rateFor(_type).toStringAsFixed(0)} = '
                  '₹${(_hours * lot.rateFor(_type)).toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: (_validWindow && !_busy) ? _book : null,
              child: _busy
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Confirm booking'),
            ),
          ],
        ),
      ),
    );
  }
}
