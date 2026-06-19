import Foundation

struct ProductCatalog {
    private let byProductCode: [String: Product]

    init(products: [Product]) {
        self.byProductCode = Dictionary(uniqueKeysWithValues: products.map { ($0.productCode, $0) })
    }

    func product(forCode code: String) -> Product? {
        byProductCode[code.trimmingCharacters(in: .whitespacesAndNewlines)]
    }

    static func loadFromBundle() -> ProductCatalog {
        guard let url = Bundle.main.url(forResource: "products", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let products = try? JSONDecoder().decode([Product].self, from: data)
        else {
            return ProductCatalog(products: [])
        }

        return ProductCatalog(products: products)
    }
}
