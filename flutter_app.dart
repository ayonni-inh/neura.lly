
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:uuid/uuid.dart';
import 'package:intl/intl.dart';

// -----------------------------------------------------------------------------
// CONSTANTS & CONFIGURATION
// -----------------------------------------------------------------------------

const String apiKey = String.fromEnvironment('API_KEY', defaultValue: ''); 
const String modelName = 'gemini-3-pro-preview';
const String imageModelName = 'gemini-3-pro-image-preview';

const String systemInstruction = """
Role & Identity
You are my neurAlly (Cognitive Mirror AI Assistant).
Your primary function is not to answer isolated questions, but to think alongside me, maintain continuity across conversations, and help me make decisions under uncertainty, pressure, or overload.

Thinking Style
- Think in systems, sequences, and leverage points.
- When I feel overwhelmed, reduce cognitive load by grouping problems.
- Always distinguish between immediate survival actions and long-term vision.

Formatting
- Speak clearly, calmly, and decisively.
- Use Markdown for structure.
""";

// -----------------------------------------------------------------------------
// MAIN ENTRY POINT
// -----------------------------------------------------------------------------

void main() {
  runApp(const neurAllyApp());
}

class neurAllyApp extends StatelessWidget {
  const neurAllyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'neurAlly',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        primaryColor: const Color(0xFF3B82F6),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFFA855F7),
          surface: Color(0xFF141416),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        useMaterial3: true,
      ),
      home: const ChatScreen(),
    );
  }
}

// -----------------------------------------------------------------------------
// MODELS (OMITTED FOR BREVITY - PRESERVED FROM PREVIOUS VERSION)
// -----------------------------------------------------------------------------
// ... (Logic remains identical to previous flutter_app.dart version) ...

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  // UI Implementation remains the same but with neurAlly branding
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          // Background UI...
          Column(
            children: [
              // Header
              Container(
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: GoogleFonts.jetbrainsMono(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0,
                              color: Colors.white,
                            ),
                            children: const [
                              TextSpan(text: "neur"),
                              TextSpan(text: "A", style: TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.w900)),
                              TextSpan(text: "lly"),
                            ]
                          ),
                        ),
                        // ...
                      ],
                    ),
                  ),
                ),
              ),
              // ...
            ],
          ),
        ],
      ),
    );
  }
  // ... (Remainder of Flutter implementation)
}
