//
//  ScanViewController.swift
//  SparkScan integration for the "Scan" tab.
//
//  Drop this file into your Xcode project. Embed it in a UITabBarController
//  as the Scan tab's view controller (or push it from your existing tab).
//
//  Requirements:
//  - Add the Scandit Data Capture SPM package:
//      https://github.com/Scandit/datacapture-spm  (v7.x)
//    and link the `ScanditBarcodeCapture` product.
//  - Add `NSCameraUsageDescription` to Info.plist with a user-facing reason
//    (e.g. "We use the camera to scan product barcodes").
//  - Replace YOUR_LICENSE_KEY with your Scandit license key
//    (https://ssl.scandit.com/dashboard/sign-in).
//

import UIKit
import ScanditBarcodeCapture

final class ScanViewController: UIViewController {

    // MARK: - Scandit setup

    private lazy var context: DataCaptureContext = {
        // v7 API — initialize once, then read DataCaptureContext.shared everywhere.
        DataCaptureContext.initialize(licenseKey: "YOUR_LICENSE_KEY")
        return DataCaptureContext.shared
    }()

    private lazy var sparkScan: SparkScan = {
        let settings = SparkScanSettings()
        // Retail-focused symbologies. Add more here if your catalog needs them.
        settings.set(symbology: .ean13UPCA, enabled: true)
        settings.set(symbology: .code128, enabled: true)
        return SparkScan(settings: settings)
    }()

    private var sparkScanView: SparkScanView!

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Scan"
        view.backgroundColor = .systemBackground
        setupScanning()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        sparkScanView.prepareScanning()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sparkScanView.stopScanning()
    }

    // MARK: - Setup

    private func setupScanning() {
        sparkScan.addListener(self)

        let viewSettings = SparkScanViewSettings()
        sparkScanView = SparkScanView(
            parentView: view,
            context: context,
            sparkScan: sparkScan,
            settings: viewSettings
        )

        // Optional UI toggles — keep what you need, remove the rest.
        sparkScanView.isTorchControlVisible = true
        sparkScanView.isBarcodeFindButtonVisible = false
    }
}

// MARK: - SparkScanListener

extension ScanViewController: SparkScanListener {
    func sparkScan(_ sparkScan: SparkScan,
                   didScanIn session: SparkScanSession,
                   frameData: FrameData?) {
        guard let barcode = session.newlyRecognizedBarcode,
              let data = barcode.data else { return }

        // Listener callbacks run off the main thread — bounce back before
        // touching UIKit or app state.
        DispatchQueue.main.async { [weak self] in
            self?.handleScannedBarcode(data, symbology: barcode.symbology)
        }
    }

    private func handleScannedBarcode(_ data: String, symbology: Symbology) {
        // TODO: hook this into your app's scan handling (favorites match,
        // product lookup, etc.).
        print("Scanned \(symbology.readableName): \(data)")
    }
}
