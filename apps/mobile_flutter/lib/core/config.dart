/// NEXUS App Configuration
///
/// Change [backendHost] to point the app at your backend:
///  - Android emulator:        http://10.0.2.2:3000
///  - iOS simulator:           http://localhost:3000
///  - Real phone (same Wi-Fi): http://<YOUR_PC_IP>:3000
class AppConfig {
  static const String backendHost = String.fromEnvironment(
    'BACKEND_HOST',
    defaultValue: '10.0.2.2:3000',
  );

  static const String apiBase = 'http://$backendHost';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 20);

  // UI
  static const String appName = 'NEXUS';

  // Payment
  static const String razorpayTestKeyId = 'rzp_test_NEXUS2026Dev';
}
