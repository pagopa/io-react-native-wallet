//
//  NotAllowedExtension.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

public enum NotAllowedExtension: String, CaseIterable {
	case policyMappings = "2.5.29.33"
	case nameConstraints = "2.5.29.30"
	case policyConstraints = "2.5.29.36"
	case inhibitAnyPolicy = "2.5.29.54"
	case freshestCRL = "2.5.29.46"
}

// Explanation:
// This enum represents a set of X.509 extensions that are not allowed in the SDK for license management.
// Each case of the enum represents a specific OID (Object Identifier) associated with certain X.509 certificate extensions.

// - `policyMappings (2.5.29.33)`: Maps a policy from the issuing certificate to a policy in the receiving certificate.
// - `nameConstraints (2.5.29.30)`: Defines constraints on names that must be present or absent in the certificates in the chain.
// - `policyConstraints (2.5.29.36)`: Specifies constraints on policies that must be adhered to in the certificate chain.
// - `inhibitAnyPolicy (2.5.29.54)`: Indicates if and when the "anyPolicy" policy should be considered.
// - `freshestCRL (2.5.29.46)`: Refers to the freshest CRL (Certificate Revocation List).

// In this context, this enum might be used to identify and handle certificate extensions
// that must not be included in the license certificates, as they could represent vulnerabilities
// or be incompatible with how the SDK functions or is distributed.
