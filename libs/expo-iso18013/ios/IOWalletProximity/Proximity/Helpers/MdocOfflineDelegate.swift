//
//  MdocOfflineDelegate.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation

/// delegate protocol for clients of the mdoc offline transfer manager
public protocol MdocOfflineDelegate: AnyObject {
	func didChangeStatus(_ newStatus: TransferStatus)
	func didFinishedWithError(_ error: Error)
	func didReceiveRequest(_ request: [String: Any], handleSelected: @escaping (Bool, RequestItems?) -> Void)
}


