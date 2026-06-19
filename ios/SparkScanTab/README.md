# SparkScan – Scan Tab (iOS, Xcode)

Native iOS implementation of the Scan tab using Scandit SparkScan v7.

## Files

- `ScanViewController.swift` — UIKit view controller that hosts `SparkScanView`. This is the Scan tab.
- `ScanTabView.swift` — Optional SwiftUI wrapper (`UIViewControllerRepresentable`) for SwiftUI-based apps.

## 1. Add the Scandit SDK

In Xcode: **File → Add Package Dependencies…**

```
https://github.com/Scandit/datacapture-spm
```

Pick the latest **7.x** release and add the **`ScanditBarcodeCapture`** product to your app target.

## 2. Info.plist

Add a camera usage description:

```
Key:    Privacy - Camera Usage Description  (NSCameraUsageDescription)
Value:  We use the camera to scan product barcodes.
```

## 3. License key

Get a license key from <https://ssl.scandit.com/dashboard/sign-in>. In `ScanViewController.swift`, replace:

```swift
DataCaptureContext.initialize(licenseKey: "YOUR_LICENSE_KEY")
```

Do **not** commit the real key — load it from a build setting or a config file ignored by git.

## 4. Mount it in your tab bar

### UIKit (`UITabBarController`)

```swift
let scanVC = ScanViewController()
scanVC.tabBarItem = UITabBarItem(
    title: "Scan",
    image: UIImage(systemName: "barcode.viewfinder"),
    tag: 1
)

let tabBar = UITabBarController()
tabBar.viewControllers = [
    // ...your other tabs,
    scanVC,
]
```

### SwiftUI

```swift
TabView {
    HomeView()
        .tabItem { Label("Home", systemImage: "house") }

    ScanTabView()
        .tabItem { Label("Scan", systemImage: "barcode.viewfinder") }
        .ignoresSafeArea()

    FavoritesView()
        .tabItem { Label("Favorites", systemImage: "star") }
}
```

## 5. Handle scans

In `ScanViewController.handleScannedBarcode(_:symbology:)`, wire the barcode
string into your app logic (favorites lookup, product details, etc.). The
callback already runs on the main thread, so it's safe to update UI directly.

## Symbologies enabled

- `.ean13UPCA` (EAN-13 / UPC-A — retail barcodes)
- `.code128` (logistics / shelf labels)

Add more in `SparkScanSettings` if your catalog uses different formats.

## Lifecycle notes

`prepareScanning()` is called in `viewWillAppear` and `stopScanning()` in
`viewWillDisappear`, so the camera releases automatically when the user
switches tabs.
