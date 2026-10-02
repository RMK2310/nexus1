import 'dart:io';
import 'package:flutter/material';
import 'package:provider/provider.dart';
import 'main.dart';
import 'cloudinary_service.dart';

class SellerPortal extends StatefulWidget {
  const SellerPortal({super.key});

  @override
  State<SellerPortal> createState() => _SellerPortalState();
}

class _SellerPortalState extends State<SellerPortal> {
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _stockController = TextEditingController();
  final _searchFolderController = TextEditingController();

  String _selectedFolder = "food_beverages/apple";
  String? _uploadedImageUrl;
  bool _isUploading = false;
  bool _isSubmitting = false;

  final List<String> _predefinedFolders = [
    "food_beverages/apple",
    "food_beverages/banana",
    "food_beverages/strawberry",
    "food_beverages/milk",
    "food_beverages/butter",
    "food_beverages/cheese",
    "food_beverages/bread",
    "food_beverages/orange",
    "food_beverages/kiwi",
    "electronics/iphone",
    "electronics/laptop",
    "electronics/headphones"
  ];

  @override
  void initState() {
    super.initState();
    _titleController.addListener(() {
      // Force title input to always remain lowercase on keypress
      final current = _titleController.text;
      if (current != current.toLowerCase()) {
        _titleController.value = _titleController.value.copyWith(
          text: current.toLowerCase(),
          selection: TextSelection.fromPosition(
            TextPosition(offset: _titleController.selection.baseOffset),
          ),
        );
      }
    });
  }

  Future<void> _handleImageSelectionAndUpload() async {
    setState(() => _isUploading = true);

    // Sandbox Mock Upload simulating direct Cloudinary uploader
    await Future.delayed(const Duration(seconds: 2));
    final sellerName = Provider.of<AppState>(context, listen: false).userName.replaceAll(" ", "_").toLowerCase();
    final keyword = _selectedFolder.split("/").last;

    setState(() {
      _uploadedImageUrl = "https://res.cloudinary.com/${CloudinaryService.cloudName}/image/upload/v1/nexus1/${_selectedFolder}/${keyword}_${sellerName}.jpg";
      _isUploading = false;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Cloudinary Direct Upload Successful!")),
    );
  }

  Future<void> _submitListing() async {
    if (_titleController.text.trim().isEmpty || _priceController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Title and Price are required fields.")),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(seconds: 1)); // Network latency

    // Fallback: If no image uploaded, default to Cloudinary folder default
    final finalImageUrl = _uploadedImageUrl ?? CloudinaryService.getDefaultFallbackUrl(_selectedFolder);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Listing created successfully! Image: $finalImageUrl"),
        backgroundColor: const Color(0xFF10B981),
      ),
    );

    // Reset Form
    _titleController.clear();
    _priceController.clear();
    _stockController.clear();
    setState(() {
      _uploadedImageUrl = null;
      _isSubmitting = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final fallbackUrl = CloudinaryService.getDefaultFallbackUrl(_selectedFolder);

    // Filter folder lists based on search folder term
    final searchKeyword = _searchFolderController.text.toLowerCase();
    final filteredFolders = _predefinedFolders.where((f) => f.contains(searchKeyword)).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Merchant Seller Portal"),
        backgroundColor: const Color(0xFF14121A),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => appState.logout(),
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "CREATE NEW LISTING",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: "Product Title (lowercase enforced)",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: "Listing Price (in Rupees)",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _stockController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: "Stock Quantity",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            
            // Searchable Cloudinary Folder Dropdown
            const Text("CLOUDINARY STORAGE TARGET FOLDER", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              controller: _searchFolderController,
              decoration: const InputDecoration(
                hintText: "Search target folder directory...",
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            Container(
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey[700]!),
                borderRadius: BorderRadius.circular(4),
              ),
              child: ListView.builder(
                itemCount: filteredFolders.length,
                itemBuilder: (context, index) {
                  final folder = filteredFolders[index];
                  final isSelected = _selectedFolder == folder;
                  return ListTile(
                    title: Text(folder, style: TextStyle(fontSize: 14, color: isSelected ? const Color(0xFF6366F1) : Colors.white)),
                    selected: isSelected,
                    dense: true,
                    onTap: () {
                      setState(() {
                        _selectedFolder = folder;
                        _searchFolderController.text = ""; // Reset search after select
                      });
                    },
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // Live Image Preview showing fallback or custom file
            const Text("PRODUCT IMAGE PREVIEW", style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: const Color(0xFF14121A),
                borderRadius: BorderRadius.circular(8),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.network(
                    _uploadedImageUrl ?? fallbackUrl,
                    fit: BoxFit.cover,
                  ),
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      color: Colors.black87,
                      child: Text(
                        _uploadedImageUrl == null ? "Using fallback standard template" : "Custom Cloudinary photo active",
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 16),
            _isUploading
                ? const Center(child: CircularProgressIndicator())
                : OutlinedButton.icon(
                    onPressed: _handleImageSelectionAndUpload,
                    icon: const Icon(Icons.cloud_upload),
                    label: const Text("Upload Custom Image to Cloudinary"),
                  ),
            const SizedBox(height: 24),
            _isSubmitting
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _submitListing,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                    child: const Text("Publish Listing"),
                  )
          ],
        ),
      ),
    );
  }
}
