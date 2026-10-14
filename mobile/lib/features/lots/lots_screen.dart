import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import 'lots_providers.dart';

class LotsScreen extends ConsumerStatefulWidget {
  const LotsScreen({super.key});

  @override
  ConsumerState<LotsScreen> createState() => _LotsScreenState();
}

class _LotsScreenState extends ConsumerState<LotsScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lots = ref.watch(lotSearchProvider(_query));
    return Scaffold(
      appBar: AppBar(title: const Text('Find parking')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: SearchBar(
              controller: _controller,
              hintText: 'Search by name or address',
              leading: const Icon(Icons.search),
              onSubmitted: (v) => setState(() => _query = v.trim()),
              trailing: [
                if (_query.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _controller.clear();
                      setState(() => _query = '');
                    },
                  ),
              ],
            ),
          ),
          Expanded(
            child: lots.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(errorMessage(e)),
                  TextButton(
                    onPressed: () => ref.invalidate(lotSearchProvider(_query)),
                    child: const Text('Retry'),
                  ),
                ]),
              ),
              data: (items) => items.isEmpty
                  ? const Center(child: Text('No parking lots found'))
                  : RefreshIndicator(
                      onRefresh: () async => ref.refresh(lotSearchProvider(_query).future),
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: items.length,
                        itemBuilder: (_, i) {
                          final lot = items[i];
                          return Card(
                            child: ListTile(
                              onTap: () => context.push('/lots/${lot.id}'),
                              title: Text(lot.name),
                              subtitle: Text('${lot.address}, ${lot.city}\n'
                                  '2W ₹${lot.twoWheelerRate.toStringAsFixed(0)}/hr (${lot.availableTwo} free) · '
                                  '4W ₹${lot.fourWheelerRate.toStringAsFixed(0)}/hr (${lot.availableFour} free)'),
                              isThreeLine: true,
                              trailing: const Icon(Icons.chevron_right),
                            ),
                          );
                        },
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
