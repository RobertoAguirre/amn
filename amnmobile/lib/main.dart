import 'package:flutter/material.dart';
import 'screens/turnos_screen.dart';

const Color amnYellow = Color(0xFFFFC600);
const Color amnBlack = Color(0xFF000000);
const Color amnWhite = Color(0xFFFFFFFF);

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AMN Control de Calidad',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: amnYellow,
          primary: amnYellow,
          secondary: amnBlack,
          background: amnWhite,
          surface: amnWhite,
          onPrimary: amnBlack,
          onSecondary: amnWhite,
          onBackground: amnBlack,
          onSurface: amnBlack,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: amnWhite,
        appBarTheme: const AppBarTheme(
          backgroundColor: amnYellow,
          foregroundColor: amnBlack,
          elevation: 0,
          iconTheme: IconThemeData(color: amnBlack),
          titleTextStyle: TextStyle(
            color: amnBlack,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: amnYellow,
          foregroundColor: amnBlack,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: amnYellow,
            foregroundColor: amnBlack,
            textStyle: const TextStyle(fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: amnYellow),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: amnYellow, width: 2),
          ),
          labelStyle: const TextStyle(color: amnBlack),
        ),
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: amnBlack),
          bodyMedium: TextStyle(color: amnBlack),
          titleLarge: TextStyle(color: amnBlack, fontWeight: FontWeight.bold),
        ),
        useMaterial3: true,
      ),
      home: const TurnosScreen(),
    );
  }
}
