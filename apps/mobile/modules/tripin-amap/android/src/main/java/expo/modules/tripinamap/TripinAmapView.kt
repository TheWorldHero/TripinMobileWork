package expo.modules.tripinamap

import android.content.Context
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.widget.LinearLayout
import com.amap.api.maps.CameraUpdateFactory
import com.amap.api.maps.MapView
import com.amap.api.maps.MapsInitializer
import com.amap.api.maps.model.LatLng
import com.amap.api.maps.model.LatLngBounds
import com.amap.api.maps.model.MarkerOptions
import com.amap.api.maps.model.PolylineOptions
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class TripinAmapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val mapView = MapView(context)
  private var markers: List<Map<String, Any?>> = emptyList()
  private var polylines: List<Map<String, Any?>> = emptyList()

  init {
    layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
    mapView.layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
    MapsInitializer.updatePrivacyShow(context, true, true)
    MapsInitializer.updatePrivacyAgree(context, true)
    mapView.onCreate(null)
    mapView.map.isTrafficEnabled = false
    mapView.map.uiSettings.isZoomControlsEnabled = false
    mapView.map.uiSettings.isCompassEnabled = false
    addView(mapView)
    updateContentDescription()
  }

  fun setMarkers(nextMarkers: List<Map<String, Any?>>?) {
    markers = nextMarkers.orEmpty()
    renderOverlays()
    updateContentDescription()
  }

  fun setPolylines(nextPolylines: List<Map<String, Any?>>?) {
    polylines = nextPolylines.orEmpty()
    renderOverlays()
    updateContentDescription()
  }

  fun destroy() {
    mapView.onDestroy()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    mapView.onResume()
  }

  override fun onDetachedFromWindow() {
    mapView.onPause()
    super.onDetachedFromWindow()
  }

  private fun updateContentDescription() {
    contentDescription =
      "Tripin AMap view with ${markers.size} markers and ${polylines.size} polylines"
  }

  private fun renderOverlays() {
    val amap = mapView.map ?: return
    amap.clear()

    val markerPoints = mutableListOf<LatLng>()
    markers.forEachIndexed { index, marker ->
      val latitude = marker.doubleValue("latitude") ?: return@forEachIndexed
      val longitude = marker.doubleValue("longitude") ?: return@forEachIndexed
      val point = LatLng(latitude, longitude)
      markerPoints.add(point)
      amap.addMarker(
        MarkerOptions()
          .position(point)
          .title(marker["title"]?.toString() ?: "Point ${index + 1}")
          .snippet(marker["subtitle"]?.toString() ?: "")
      )
    }

    polylines.forEach { polyline ->
      val coordinates = polyline["coordinates"] as? List<*> ?: return@forEach
      val points = coordinates.mapNotNull { item ->
        val coordinate = item as? Map<*, *> ?: return@mapNotNull null
        val latitude = coordinate.doubleValue("latitude") ?: return@mapNotNull null
        val longitude = coordinate.doubleValue("longitude") ?: return@mapNotNull null
        LatLng(latitude, longitude)
      }

      if (points.size >= 2) {
        amap.addPolyline(
          PolylineOptions()
            .addAll(points)
            .width(polyline.floatValue("width") ?: 8f)
            .color(android.graphics.Color.parseColor(polyline["color"]?.toString() ?: "#14443f"))
        )
        markerPoints.addAll(points)
      }
    }

    val uniquePoints = markerPoints.distinctBy { "${it.latitude},${it.longitude}" }
    if (uniquePoints.isEmpty()) {
      amap.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(30.5928, 114.3055), 12f))
      return
    }

    post {
      if (uniquePoints.size == 1) {
        amap.animateCamera(CameraUpdateFactory.newLatLngZoom(uniquePoints.first(), 15f))
      } else {
        val builder = LatLngBounds.builder()
        uniquePoints.forEach { builder.include(it) }
        amap.animateCamera(CameraUpdateFactory.newLatLngBounds(builder.build(), 80))
      }
    }
  }

  private fun Map<*, *>.doubleValue(key: String): Double? {
    return when (val value = this[key]) {
      is Number -> value.toDouble()
      is String -> value.toDoubleOrNull()
      else -> null
    }
  }

  private fun Map<*, *>.floatValue(key: String): Float? {
    return when (val value = this[key]) {
      is Number -> value.toFloat()
      is String -> value.toFloatOrNull()
      else -> null
    }
  }
}
