import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/models.dart';
import 'package:mobile/features/auth/auth_controller.dart';
import 'package:mobile/features/auth/auth_screen.dart';

class _LoggedOut extends AuthController {
  @override
  Future<AppUser?> build() async => null;
}

void main() {
  testWidgets('login screen renders when logged out', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authProvider.overrideWith(_LoggedOut.new)],
        child: const MaterialApp(home: AuthScreen()),
      ),
    );

    expect(find.text('ParkSetu'), findsOneWidget);
    expect(find.text('Log in'), findsOneWidget);
  });

  test('Booking model parses API payload', () {
    final b = Booking.fromJson({
      'id': '1',
      'vehicleNumber': 'MH12AB1234',
      'vehicleType': 'TWO_WHEELER',
      'startTime': '2030-01-01T10:00:00.000Z',
      'endTime': '2030-01-01T12:00:00.000Z',
      'totalAmount': 20,
      'status': 'CONFIRMED',
      'lot': {'name': 'City Center'},
      'slot': {'label': '2W-001'},
    });
    expect(b.vehicleType, VehicleType.twoWheeler);
    expect(b.canCancel, isTrue);
  });
}
