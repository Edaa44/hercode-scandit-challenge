import Foundation

struct Product: Codable, Identifiable {
    let productCode: String
    let productID: String
    let name: String
    let brand: String
    let category: String
    let color: String
    let size: String
    let priceCHF: Double
    let discountPct: Int
    let zone: String
    let zoneName: String
    let aisle: String
    let stockTotal: Int
    let stockFront: Int
    let description: String

    var id: String { productCode }

    enum CodingKeys: String, CodingKey {
        case productCode = "product_code"
        case productID = "product_id"
        case name
        case brand
        case category
        case color
        case size
        case priceCHF = "price_chf"
        case discountPct = "discount_pct"
        case zone
        case zoneName = "zone_name"
        case aisle
        case stockTotal = "stock_total"
        case stockFront = "stock_front"
        case description
    }
}
