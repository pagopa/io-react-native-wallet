//
//  TransferStatus.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

/// Transfer status enumeration
public enum TransferStatus: String {
	case initializing
	case initialized
	case qrEngagementReady
	case connected
	case started
	case requestReceived
	case userSelected
	case responseSent
	case disconnected
	case error
}
