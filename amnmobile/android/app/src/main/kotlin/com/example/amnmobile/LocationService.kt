package com.example.amnmobile

import android.app.*
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Binder
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.*

class LocationService : Service(), LocationListener {
    private val binder = LocalBinder()
    private lateinit var locationManager: LocationManager
    private var isTracking = false
    
    companion object {
        private const val NOTIFICATION_ID = 12345
        private const val CHANNEL_ID = "AMN_Location_Tracking"
        private const val TAG = "AMN_LocationService"
    }

    inner class LocalBinder : Binder() {
        fun getService(): LocationService = this@LocationService
    }

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        createNotificationChannel()
    }

    override fun onBind(intent: Intent): IBinder {
        return binder
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Servicio iniciado")
        startForeground(NOTIFICATION_ID, createNotification())
        return START_STICKY
    }

    fun startLocationTracking() {
        if (isTracking) return
        
        try {
            Log.d(TAG, "Iniciando rastreo de ubicación")

            // Solicitar actualizaciones de ubicación
            if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    15000L, // 15 segundos
                    5f, // 5 metros
                    this,
                    Looper.getMainLooper()
                )
                
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    15000L, // 15 segundos
                    5f, // 5 metros
                    this,
                    Looper.getMainLooper()
                )
                
                isTracking = true
                Log.d(TAG, "Rastreo de ubicación iniciado correctamente")
            } else {
                Log.e(TAG, "Permisos de ubicación no concedidos")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error iniciando rastreo: ${e.message}")
        }
    }

    fun stopLocationTracking() {
        if (!isTracking) return
        
        try {
            Log.d(TAG, "Deteniendo rastreo de ubicación")
            locationManager.removeUpdates(this)
            isTracking = false
            Log.d(TAG, "Rastreo de ubicación detenido")
        } catch (e: Exception) {
            Log.e(TAG, "Error deteniendo rastreo: ${e.message}")
        }
    }

    override fun onLocationChanged(location: Location) {
        try {
            Log.d(TAG, "Nueva ubicación: ${location.latitude}, ${location.longitude}")
            
            // Crear evento de ubicación
            val event = createLocationEvent(location)
            
            // Guardar en base de datos local (SQLite)
            saveLocationToDatabase(event)
            
            // Enviar al servidor si hay conexión
            sendToServer(event)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error procesando ubicación: ${e.message}")
        }
    }

    private fun createLocationEvent(location: Location): Map<String, Any> {
        val now = Date()
        val mexicoTime = Calendar.getInstance(TimeZone.getTimeZone("America/Mexico_City"))
        mexicoTime.time = now
        
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("America/Mexico_City")
        
        return mapOf(
            "empleadoId" to "EMP_001", // Obtener de SharedPreferences
            "empleadoNombre" to "Empleado Prueba", // Obtener de SharedPreferences
            "plantaId" to "PLANTA_001",
            "plantaNombre" to "Planta Principal",
            "tipoEvento" to "ubicacion_background",
            "fechaHora" to dateFormat.format(mexicoTime.time),
            "latitud" to location.latitude,
            "longitud" to location.longitude,
            "precision" to location.accuracy,
            "sincronizado" to 0
        )
    }

    private fun saveLocationToDatabase(event: Map<String, Any>) {
        try {
            // Aquí implementarías la lógica para guardar en SQLite
            // Por ahora solo log
            Log.d(TAG, "Guardando en base de datos local: $event")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando en base de datos: ${e.message}")
        }
    }

    private fun sendToServer(event: Map<String, Any>) {
        try {
            // Aquí implementarías la lógica para enviar al servidor
            // Por ahora solo log
            Log.d(TAG, "Enviando al servidor: $event")
        } catch (e: Exception) {
            Log.e(TAG, "Error enviando al servidor: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "AMN Location Tracking",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Rastreando ubicación en segundo plano"
        }
        
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.createNotificationChannel(channel)
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AMN Control de Calidad")
            .setContentText("Rastreando ubicación en segundo plano")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }

    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {
        Log.d(TAG, "Estado del proveedor $provider cambiado a $status")
    }

    override fun onProviderEnabled(provider: String) {
        Log.d(TAG, "Proveedor $provider habilitado")
    }

    override fun onProviderDisabled(provider: String) {
        Log.d(TAG, "Proveedor $provider deshabilitado")
    }

    override fun onDestroy() {
        super.onDestroy()
        stopLocationTracking()
        Log.d(TAG, "Servicio destruido")
    }
}
