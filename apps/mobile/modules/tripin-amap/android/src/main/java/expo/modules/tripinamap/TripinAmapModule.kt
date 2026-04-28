package expo.modules.tripinamap

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TripinAmapModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TripinAmap")

    View(TripinAmapView::class) {
      OnViewDestroys { view: TripinAmapView ->
        view.destroy()
      }

      Prop("markers") { view: TripinAmapView, markers: List<Map<String, Any?>>? ->
        view.setMarkers(markers)
      }

      Prop("polylines") { view: TripinAmapView, polylines: List<Map<String, Any?>>? ->
        view.setPolylines(polylines)
      }
    }
  }
}
