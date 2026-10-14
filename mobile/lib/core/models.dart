enum VehicleType {
  twoWheeler('TWO_WHEELER', 'Two-wheeler'),
  fourWheeler('FOUR_WHEELER', 'Four-wheeler');

  const VehicleType(this.api, this.label);
  final String api;
  final String label;

  static VehicleType parse(String v) =>
      values.firstWhere((e) => e.api == v, orElse: () => fourWheeler);
}

class AppUser {
  AppUser({required this.id, required this.name, required this.email, required this.role});

  final String id;
  final String name;
  final String email;
  final String role;

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['id'] as String,
        name: j['name'] as String,
        email: j['email'] as String,
        role: j['role'] as String,
      );
}

class Lot {
  Lot({
    required this.id,
    required this.name,
    required this.address,
    required this.city,
    required this.description,
    required this.twoWheelerRate,
    required this.fourWheelerRate,
    required this.availableTwo,
    required this.availableFour,
  });

  final String id;
  final String name;
  final String address;
  final String city;
  final String? description;
  final double twoWheelerRate;
  final double fourWheelerRate;
  final int availableTwo;
  final int availableFour;

  double rateFor(VehicleType t) =>
      t == VehicleType.twoWheeler ? twoWheelerRate : fourWheelerRate;

  factory Lot.fromJson(Map<String, dynamic> j) {
    final avail = (j['availableSlots'] as Map?) ?? const {};
    return Lot(
      id: j['id'] as String,
      name: j['name'] as String,
      address: j['address'] as String,
      city: j['city'] as String,
      description: j['description'] as String?,
      twoWheelerRate: (j['twoWheelerRate'] as num).toDouble(),
      fourWheelerRate: (j['fourWheelerRate'] as num).toDouble(),
      availableTwo: (avail['TWO_WHEELER'] as num?)?.toInt() ?? 0,
      availableFour: (avail['FOUR_WHEELER'] as num?)?.toInt() ?? 0,
    );
  }
}

class Booking {
  Booking({
    required this.id,
    required this.lotName,
    required this.slotLabel,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.startTime,
    required this.endTime,
    required this.totalAmount,
    required this.status,
  });

  final String id;
  final String lotName;
  final String slotLabel;
  final String vehicleNumber;
  final VehicleType vehicleType;
  final DateTime startTime;
  final DateTime endTime;
  final double totalAmount;
  final String status;

  bool get canCancel => status == 'CONFIRMED' && endTime.isAfter(DateTime.now());

  factory Booking.fromJson(Map<String, dynamic> j) => Booking(
        id: j['id'] as String,
        lotName: (j['lot']?['name'] as String?) ?? 'Parking lot',
        slotLabel: (j['slot']?['label'] as String?) ?? '-',
        vehicleNumber: j['vehicleNumber'] as String,
        vehicleType: VehicleType.parse(j['vehicleType'] as String),
        startTime: DateTime.parse(j['startTime'] as String).toLocal(),
        endTime: DateTime.parse(j['endTime'] as String).toLocal(),
        totalAmount: (j['totalAmount'] as num).toDouble(),
        status: j['status'] as String,
      );
}
