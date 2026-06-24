import Foundation

enum ProductCatalogError: LocalizedError {
    case missingFile
    case unreadableData(Error)
    case invalidJSON(Error)

    var errorDescription: String? {
        switch self {
        case .missingFile:
            return "products.json was not found in the app bundle."
        case .unreadableData(let error):
            return "products.json could not be read: \(error.localizedDescription)"
        case .invalidJSON(let error):
            return "products.json could not be decoded: \(error.localizedDescription)"
        }
    }
}

struct ProductCatalog {
    private let byProductCode: [String: Product]

    init(products: [Product]) {
        var byCode: [String: Product] = [:]
        for (index, product) in products.enumerated() {
            if let existing = byCode[product.productCode] {
                print(
                    "Warning: duplicate product_code '\(product.productCode)' at index \(index). " +
                    "Keeping latest product_id '\(product.productID)' over '\(existing.productID)'."
                )
            }
            byCode[product.productCode] = product
        }
        self.byProductCode = byCode
    }

    func product(forCode code: String) -> Product? {
        byProductCode[code.trimmingCharacters(in: .whitespacesAndNewlines)]
    }

    static func loadFromBundle() throws -> ProductCatalog {
        guard let url = Bundle.main.url(forResource: "products", withExtension: "json") else {
            throw ProductCatalogError.missingFile
        }

        let data: Data
        do {
            data = try Data(contentsOf: url)
        } catch {
            throw ProductCatalogError.unreadableData(error)
        }

        let products: [Product]
        do {
            products = try JSONDecoder().decode([Product].self, from: data)
        } catch {
            throw ProductCatalogError.invalidJSON(error)
        }

        return ProductCatalog(products: products)
    }
}
