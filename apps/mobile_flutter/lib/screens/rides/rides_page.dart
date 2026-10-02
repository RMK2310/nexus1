import 'dart:math';

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/common.dart';

class _VehicleOption {
  final String name;
  final IconData icon;
  final int perKmPaise;
  final String eta;
  const _VehicleOption(this.name, this.icon, this.perKmPaise, this.eta);
}

class RidesPage extends StatefulWidget {
  const RidesPage({super.key});

  @override
  State<RidesPage> createState() => _RidesPageState();
}

class _RidesPageState extends State<RidesPage> {
  final _pickup = TextEditingController(text: 'Current location');
  final _drop = TextEditingController();

  int _selected = 0;
  bool _searching = false;
  int? _fare; // paise

  static const _vehicles = [
    _VehicleOption('Bike', Icons.two_wheeler_rounded, 800, '2 min'),
    _VehicleOption('Auto', Icons.local_taxi_rounded, 1200, '4 min'),
    _VehicleOption('Cab', Icons.directions_car_filled_rounded, 2200, '6 min'),
  ];

  void _estimateFare() {
    if (_drop.text.trim().isEmpty) return;
    final km = 3 + Random().nextInt(12);
    setState(() {
      _fare = _vehicles[_selected].perKmPaise * km + 2500;
    });
  }

  Future<void> _bookRide() async {
    setState(() => _searching = true);
    // Simulated driver-matching (real API ships with the mobility module).
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    setState(() {
      _searching = false;
      _fare = null;
      _drop.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Ride confirmed! Driver arriving in 3 minutes.'),
        backgroundColor: NexusTheme.rideAccent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
          children: [
            const NexusHeader(
              title: 'NEXUS Rides',
              subtitle: 'Hop on. Get there.',
            ),
            const SizedBox(height: 12),
            // Map placeholder with animated gradient
            Container(
              height: 190,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    NexusTheme.rideAccent.withOpacity(0.16),
                    NexusTheme.primary.withOpacity(0.12),
                    NexusTheme.background,
                  ],
                ),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: NexusTheme.border),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Icon(Icons.map_rounded,
                        size: 64,
                        color: NexusTheme.textMuted.withOpacity(0.5)),
                  ),
                  Positioned(
                    top: 14,
                    left: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.gps_fixed_rounded,
                              color: NexusTheme.rideAccent, size: 14),
                          SizedBox(width: 6),
                          Text('Live map view',
                              style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            // Location fields
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: NexusTheme.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: NexusTheme.border),
              ),
              child: Column(
                children: [
                  TextField(
                    controller: _pickup,
                    readOnly: true,
                    decoration: const InputDecoration(
                      hintText: 'Pickup location',
                      prefixIcon: Icon(Icons.radio_button_checked_rounded,
                          color: NexusTheme.chatAccent, size: 20),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _drop,
                    onChanged: (_) => _estimateFare(),
                    decoration: const InputDecoration(
                      hintText: 'Where to?',
                      prefixIcon: Icon(Icons.location_on_rounded,
                          color: NexusTheme.rideAccent, size: 20),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const SectionTitle('Choose your ride'),
            ...List.generate(_vehicles.length, (i) {
              final v = _vehicles[i];
              final sel = _selected == i;
              return GestureDetector(
                onTap: () {
                  setState(() => _selected = i);
                  _estimateFare();
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: sel
                        ? NexusTheme.rideAccent.withOpacity(0.10)
                        : NexusTheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: sel
                            ? NexusTheme.rideAccent
                            : NexusTheme.border.withOpacity(0.6),
                        width: sel ? 1.4 : 1),
                  ),
                  child: Row(
                    children: [
                      Icon(v.icon,
                          color: sel
                              ? NexusTheme.rideAccent
                              : NexusTheme.textSecondary,
                          size: 28),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(v.name,
                                style: const TextStyle(
                                    color: NexusTheme.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14.5)),
                            Text('${v.eta} away · fastest in traffic',
                                style: const TextStyle(
                                    color: NexusTheme.textMuted,
                                    fontSize: 11.5)),
                          ],
                        ),
                      ),
                      Text(_fare == null ? '—' : inr(_fare!),
                          style: TextStyle(
                              color: sel
                                  ? NexusTheme.rideAccent
                                  : NexusTheme.textSecondary,
                              fontWeight: FontWeight.w800,
                              fontSize: 15)),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: _drop.text.trim().isEmpty || _searching
                  ? null
                  : _bookRide,
              style: FilledButton.styleFrom(
                  backgroundColor: NexusTheme.rideAccent,
                  foregroundColor: Colors.black),
              child: _searching
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2.2, color: Colors.black)),
                        SizedBox(width: 12),
                        Text('Finding your driver…',
                            style: TextStyle(color: Colors.black)),
                      ],
                    )
                  : const Text('Book ride'),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: NexusTheme.surfaceLight.withOpacity(0.6),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      color: NexusTheme.textMuted, size: 18),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Fares are estimates. Live driver matching & tracking arrive with the Mobility module.',
                      style: TextStyle(color: NexusTheme.textMuted, fontSize: 11.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
