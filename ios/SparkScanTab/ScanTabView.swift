//
//  ScanTabView.swift
//  SwiftUI wrapper around ScanViewController, for apps using SwiftUI tabs.
//
//  Usage:
//      TabView {
//          ScanTabView()
//              .tabItem { Label("Scan", systemImage: "barcode.viewfinder") }
//              .ignoresSafeArea()
//      }
//

import SwiftUI
import UIKit

struct ScanTabView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> ScanViewController {
        ScanViewController()
    }

    func updateUIViewController(_ uiViewController: ScanViewController,
                                context: Context) {
        // Nothing to update — SparkScan manages its own state.
    }
}

#Preview {
    ScanTabView()
        .ignoresSafeArea()
}
