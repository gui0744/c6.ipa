import UIKit

/// Exemplo para integrar em um app host proprio/autorizado.
/// Adicione ao view controller que controla a tela do app.
final class FourFingerPanelHost {
    private weak var hostView: UIView?
    private let panel: UIView

    init(hostView: UIView, panel: UIView) {
        self.hostView = hostView
        self.panel = panel
        panel.isHidden = true
        panel.layer.cornerRadius = 16
        panel.clipsToBounds = true

        let gesture = UITapGestureRecognizer(target: self, action: #selector(togglePanel))
        gesture.numberOfTouchesRequired = 4
        gesture.numberOfTapsRequired = 1
        gesture.cancelsTouchesInView = false
        hostView.addGestureRecognizer(gesture)
    }

    @objc private func togglePanel() {
        panel.isHidden.toggle()
    }
}
