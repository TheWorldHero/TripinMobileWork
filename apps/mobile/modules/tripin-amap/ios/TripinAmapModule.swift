import ExpoModulesCore

public final class TripinAmapModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TripinAmap")

    View(TripinAmapView.self) {
      Prop("markers") { (view: TripinAmapView, markers: [[String: Any]]?) in
        view.markers = markers ?? []
      }

      Prop("polylines") { (view: TripinAmapView, polylines: [[String: Any]]?) in
        view.polylines = polylines ?? []
      }
    }
  }
}
