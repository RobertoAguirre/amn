package com.example.amnmobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.content.Intent
import android.content.Context

class MainActivity: FlutterActivity() {
    private val CHANNEL = "amn_location_service"
    private var locationService: LocationService? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startBackgroundTracking" -> {
                    startLocationService()
                    result.success(true)
                }
                "stopBackgroundTracking" -> {
                    stopLocationService()
                    result.success(true)
                }
                "isServiceRunning" -> {
                    result.success(locationService != null)
                }
                "setUserData" -> {
                    val empleadoId = call.argument<String>("empleadoId") ?: ""
                    val empleadoNombre = call.argument<String>("empleadoNombre") ?: ""
                    // Aquí podrías guardar los datos en SharedPreferences
                    result.success(true)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startLocationService() {
        val intent = Intent(this, LocationService::class.java)
        startForegroundService(intent)
        
        // Bind al servicio para controlarlo
        bindService(intent, object : android.content.ServiceConnection {
            override fun onServiceConnected(name: android.content.ComponentName?, service: android.os.IBinder?) {
                locationService = (service as LocationService.LocalBinder).getService()
                locationService?.startLocationTracking()
            }
            
            override fun onServiceDisconnected(name: android.content.ComponentName?) {
                locationService = null
            }
        }, Context.BIND_AUTO_CREATE)
    }

    private fun stopLocationService() {
        locationService?.stopLocationTracking()
        locationService = null
        
        val intent = Intent(this, LocationService::class.java)
        stopService(intent)
    }
}
