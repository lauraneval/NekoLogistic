# Flutter Courier Models

Use these DTOs in the Flutter app to consume the courier bag APIs.

## 1. Bag Task List Model

```dart
class CourierBagTask {
  final String id;
  final String bagCode;
  final String destinationCity;
  final int packageCount;
  final String status;
  final String? assignedCourierId;
  final String? receiverName;
  final String? receiverAddress;
  final double? latitude;
  final double? longitude;
  final List<CourierBagPackage> packages;

  const CourierBagTask({
    required this.id,
    required this.bagCode,
    required this.destinationCity,
    required this.packageCount,
    required this.status,
    required this.assignedCourierId,
    required this.receiverName,
    required this.receiverAddress,
    required this.latitude,
    required this.longitude,
    required this.packages,
  });

  factory CourierBagTask.fromJson(Map<String, dynamic> json) {
    return CourierBagTask(
      id: json['id'] as String,
      bagCode: json['bag_code'] as String,
      destinationCity: json['destination_city'] as String,
      packageCount: (json['package_count'] as num).toInt(),
      status: json['status'] as String,
      assignedCourierId: json['assigned_courier_id'] as String?,
      receiverName: json['receiver_name'] as String?,
      receiverAddress: json['receiver_address'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      packages: (json['packages'] as List<dynamic>? ?? [])
          .map((item) => CourierBagPackage.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
```

```dart
class CourierBagPackage {
  final String id;
  final String resi;
  final String receiverName;
  final String receiverAddress;
  final String status;
  final double? latitude;
  final double? longitude;

  const CourierBagPackage({
    required this.id,
    required this.resi,
    required this.receiverName,
    required this.receiverAddress,
    required this.status,
    required this.latitude,
    required this.longitude,
  });

  factory CourierBagPackage.fromJson(Map<String, dynamic> json) {
    return CourierBagPackage(
      id: json['id'] as String,
      resi: json['resi'] as String,
      receiverName: json['receiver_name'] as String,
      receiverAddress: json['receiver_address'] as String,
      status: json['status'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }
}
```

## 2. Bag Detail + Timeline Model

```dart
class CourierBagDetail {
  final CourierBagSummary bag;
  final List<CourierBagPackageTimeline> packages;

  const CourierBagDetail({required this.bag, required this.packages});

  factory CourierBagDetail.fromJson(Map<String, dynamic> json) {
    return CourierBagDetail(
      bag: CourierBagSummary.fromJson(json['bag'] as Map<String, dynamic>),
      packages: (json['packages'] as List<dynamic>? ?? [])
          .map((item) => CourierBagPackageTimeline.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
```

```dart
class CourierBagSummary {
  final String id;
  final String bagCode;
  final String destinationCity;
  final String status;
  final String? assignedCourierId;

  const CourierBagSummary({
    required this.id,
    required this.bagCode,
    required this.destinationCity,
    required this.status,
    required this.assignedCourierId,
  });

  factory CourierBagSummary.fromJson(Map<String, dynamic> json) {
    return CourierBagSummary(
      id: json['id'] as String,
      bagCode: json['bag_code'] as String,
      destinationCity: json['destination_city'] as String,
      status: json['status'] as String,
      assignedCourierId: json['assigned_courier_id'] as String?,
    );
  }
}
```

```dart
class CourierBagPackageTimeline {
  final String id;
  final String resi;
  final String receiverName;
  final String receiverAddress;
  final String status;
  final double? latitude;
  final double? longitude;
  final List<CourierTrackingEvent> timeline;

  const CourierBagPackageTimeline({
    required this.id,
    required this.resi,
    required this.receiverName,
    required this.receiverAddress,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.timeline,
  });

  factory CourierBagPackageTimeline.fromJson(Map<String, dynamic> json) {
    return CourierBagPackageTimeline(
      id: json['id'] as String,
      resi: json['resi'] as String,
      receiverName: json['receiver_name'] as String,
      receiverAddress: json['receiver_address'] as String,
      status: json['status'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      timeline: (json['timeline'] as List<dynamic>? ?? [])
          .map((item) => CourierTrackingEvent.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
```

```dart
class CourierTrackingEvent {
  final String eventCode;
  final String eventLabel;
  final String? location;
  final String? description;
  final DateTime createdAt;

  const CourierTrackingEvent({
    required this.eventCode,
    required this.eventLabel,
    required this.location,
    required this.description,
    required this.createdAt,
  });

  factory CourierTrackingEvent.fromJson(Map<String, dynamic> json) {
    return CourierTrackingEvent(
      eventCode: json['event_code'] as String,
      eventLabel: json['event_label'] as String,
      location: json['location'] as String?,
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
```

## 3. Delivery Request Model

```dart
class CourierDeliveryRequest {
  final String status;
  final String podImageUrl;
  final double courierLatitude;
  final double courierLongitude;
  final double? targetLatitude;
  final double? targetLongitude;
  final DateTime? deliveredAt;

  const CourierDeliveryRequest({
    this.status = 'DELIVERED',
    required this.podImageUrl,
    required this.courierLatitude,
    required this.courierLongitude,
    this.targetLatitude,
    this.targetLongitude,
    this.deliveredAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'pod_image_url': podImageUrl,
      'courier_latitude': courierLatitude,
      'courier_longitude': courierLongitude,
      'target_latitude': targetLatitude,
      'target_longitude': targetLongitude,
      'delivered_at': deliveredAt?.toIso8601String(),
    };
  }
}
```

## 4. Suggested API Service

```dart
class CourierApi {
  CourierApi(this.baseUrl, this.token);

  final String baseUrl;
  final String token;

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      };

  Future<List<CourierBagTask>> fetchTasks() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/courier/tasks?status=OUT_FOR_DELIVERY'),
      headers: _headers,
    );

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    final data = (json['data'] as List<dynamic>? ?? [])
        .map((item) => CourierBagTask.fromJson(item as Map<String, dynamic>))
        .toList();
    return data;
  }

  Future<CourierBagDetail> fetchBagDetail(String bagId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/courier/tasks/$bagId'),
      headers: _headers,
    );

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return CourierBagDetail.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<CourierBagDetail> fetchBagTimeline(String bagId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/courier/tasks/$bagId/timeline'),
      headers: _headers,
    );

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return CourierBagDetail.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<void> deliverPackage(String packageId, CourierDeliveryRequest request) async {
    await http.put(
      Uri.parse('$baseUrl/api/courier/tasks/$packageId/deliver'),
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );
  }
}
```

## 5. UI Mapping Notes

- Render one bag card for each `CourierBagTask`.
- Open the bag detail page from the card and show the `packages` list.
- Use the timeline endpoint when a driver taps one package.
- When a package is delivered, refresh the bag detail because the bag status may change to `DELIVERED`.