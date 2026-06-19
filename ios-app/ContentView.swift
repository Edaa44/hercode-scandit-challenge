import SwiftUI

struct ContentView: View {
    @State private var scannedCode: String = ""
    @State private var scannedProduct: Product?
    @State private var catalogLoadError: String?

    var body: some View {
        ZStack {
            VStack(alignment: .leading, spacing: 12) {
                Text("In-Store Product Scanner")
                    .font(.title2)
                    .bold()

                if scannedCode.isEmpty {
                    Text("Scan a barcode to load product data from products.json")
                        .foregroundStyle(.secondary)
                } else {
                    Text("Last scanned code: \(scannedCode)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if let product = scannedProduct {
                    Group {
                        Text(product.name).font(.headline)
                        Text("Brand: \(product.brand)")
                        Text("Category: \(product.category)")
                        Text("Color / Size: \(product.color) / \(product.size)")
                        Text(String(format: "Price: CHF %.2f", product.priceCHF))
                        Text("Location: Zone \(product.zone) (\(product.zoneName)), Aisle \(product.aisle)")
                        Text("Stock: \(product.stockFront) front / \(product.stockTotal) total")
                        Text(product.description)
                            .foregroundStyle(.secondary)
                    }
                } else if !scannedCode.isEmpty {
                    Text("No matching product found in dataset for this barcode.")
                        .foregroundStyle(.red)
                }

                if let catalogLoadError {
                    Text("Dataset load error: \(catalogLoadError)")
                        .foregroundStyle(.red)
                }

                Spacer()
            }
            .padding()

            SparkScanContainer(
                onScan: { product, rawCode in
                    scannedCode = rawCode
                    scannedProduct = product
                },
                onCatalogLoadError: { message in
                    catalogLoadError = message
                }
            )
            .allowsHitTesting(true)
        }
    }
}

private struct SparkScanContainer: UIViewControllerRepresentable {
    let onScan: (Product?, String) -> Void
    let onCatalogLoadError: (String) -> Void

    func makeUIViewController(context: Context) -> SparkScanViewController {
        SparkScanViewController(onScan: onScan, onCatalogLoadError: onCatalogLoadError)
    }

    func updateUIViewController(_ uiViewController: SparkScanViewController, context: Context) {}
}

#Preview {
    ContentView()
}
