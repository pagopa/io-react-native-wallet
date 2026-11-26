//
//  DigestAlgorithmKind.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

/// Table 21 — Digest algorithm identifiers
public enum DigestAlgorithmKind: String, Sendable {
	case SHA256 = "SHA-256"
	case SHA384 = "SHA-384"
	case SHA512 = "SHA-512"
}
