import UIKit
import ScanditBarcodeCapture

final class SparkScanViewController: UIViewController, SparkScanListener {
    private var catalog = ProductCatalog(products: [])
    private let onScan: (Product?, String) -> Void

    private lazy var context: DataCaptureContext = {
        let licenseKey = (Bundle.main.object(forInfoDictionaryKey: "SCANDIT_LICENSE_KEY") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let licenseKey, !licenseKey.isEmpty else {
            fatalError("SCANDIT_LICENSE_KEY is missing in Info.plist.")
        }
        DataCaptureContext.initialize(licenseKey: licenseKey)
        return DataCaptureContext.shared
    }()

    private lazy var sparkScan: SparkScan = {
        let settings = SparkScanSettings()
        settings.set(symbology: .ean13UPCA, enabled: true)
        settings.set(symbology: .code128, enabled: true)
        settings.set(symbology: .qr, enabled: true)
        return SparkScan(settings: settings)
    }()

    private var sparkScanView: SparkScanView?

    init(onScan: @escaping (Product?, String) -> Void) {
        self.onScan = onScan
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        do {
            catalog = try ProductCatalog.loadFromBundle()
        } catch {
            print("Catalog loading error: \(error.localizedDescription)")
        }
        setupRecognition()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        sparkScanView?.prepareScanning()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        sparkScanView?.stopScanning()
    }

    private func setupRecognition() {
        sparkScan.addListener(self)
        sparkScanView = SparkScanView(
            parentView: view,
            context: context,
            sparkScan: sparkScan,
            settings: SparkScanViewSettings()
        )
    }

    func sparkScan(_ sparkScan: SparkScan, didScanIn session: SparkScanSession, frameData: FrameData?) {
        guard let rawCode = session.newlyRecognizedBarcode?.data else { return }

        let matched = catalog.product(forCode: rawCode)
        DispatchQueue.main.async {
            self.onScan(matched, rawCode)
        }
    }
}
