//
//  SessionRole.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

/// The role for the session encryption object.
public enum SessionRole: String {
	// mdoc reader (verifier) role
    case reader
	// mdoc (holder) role
    case mdoc
}
