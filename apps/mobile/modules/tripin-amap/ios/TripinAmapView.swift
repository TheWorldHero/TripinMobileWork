import ExpoModulesCore
import MAMapKit

public final class TripinAmapView: ExpoView {
  private let mapView = MAMapView(frame: .zero)

  var markers: [[String: Any]] = [] {
    didSet {
      updateAccessibilityLabel()
    }
  }

  var polylines: [[String: Any]] = [] {
    didSet {
      updateAccessibilityLabel()
    }
  }

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    mapView.showsCompass = true
    addSubview(mapView)
    updateAccessibilityLabel()
  }

  @available(*, unavailable)
  public required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    mapView.frame = bounds
  }

  private func updateAccessibilityLabel() {
    accessibilityLabel =
      "Tripin AMap view with \(markers.count) markers and \(polylines.count) polylines"
  }
}
