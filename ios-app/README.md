# iOS SparkScan app (dataset-backed)

This folder contains a minimal SwiftUI app scaffold that integrates **Scandit SparkScan** and looks up the scanned barcode in `products.json`.

## Setup

1. Create a new iOS App project in Xcode (Swift + SwiftUI).
2. Copy all files from this folder into your app target.
3. Add `dataset/products.json` to your Xcode target as a bundled resource (keep the filename `products.json`).
4. Add Scandit packages via Swift Package Manager:
   - `https://github.com/Scandit/datacapture-spm`
   - Add products: `ScanditBarcodeCapture`, `ScanditCaptureCore`
5. Add camera permission to `Info.plist`:
   - `NSCameraUsageDescription` = `Scan barcodes to show product details in store.`
6. Add your Scandit license key in `Info.plist`:
   - `SCANDIT_LICENSE_KEY` = `YOUR_LICENSE_KEY`

## Symbologies enabled

This app enables only the formats present in the provided dataset:
- EAN-13 (`.ean13UPCA`)
- Code 128 (`.code128`)
- QR (`.qr`)

## Behavior

- SparkScan runs as an overlay on top of `ContentView`.
- Each scan tries to match `product_code` in `products.json`.
- If matched, product details are shown (name, price, zone/aisle, stock).
