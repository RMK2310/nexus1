import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class CloudinaryService {
  static const String cloudName = "ddvwimzfr";
  static const String uploadPreset = "nexus_preset";

  /// Uploads a local file directly to Cloudinary using Unsigned presets
  /// and target folder directory path
  static Future<String?> uploadImage(File file, String folderPath, String filename) async {
    try {
      final uri = Uri.parse("https://api.cloudinary.com/v1_1/$cloudName/image/upload");
      final request = http.MultipartRequest("POST", uri);

      request.fields["upload_preset"] = uploadPreset;
      request.fields["folder"] = "nexus1/$folderPath";
      request.fields["public_id"] = filename;

      final multipartFile = await http.MultipartFile.fromPath("file", file.path);
      request.files.add(multipartFile);

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        final data = json.decode(responseBody);
        return data["secure_url"] as String;
      } else {
        final data = json.decode(responseBody);
        print("Cloudinary Upload Error: ${data["error"]?["message"]}");
        return null;
      }
    } catch (e) {
      print("Failed to upload to Cloudinary: $e");
      return null;
    }
  }

  /// Generates the standard default fallback image url based on selected folder path
  static String getDefaultFallbackUrl(String folderPath) {
    return "https://res.cloudinary.com/$cloudName/image/upload/v1/nexus1/$folderPath/default.jpg";
  }
}
