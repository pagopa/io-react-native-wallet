//
//  SecurityHelpers.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

internal import X509
import CryptoKit
import Security
import Foundation
internal import SwiftASN1

public class SecurityHelpers {
    public static let nonAllowedExtensions: [String] = NotAllowedExtension.allCases.map(\.rawValue)
    
    
    public static func isMdocCertificateChainValid(secCertChain: [SecCertificate], usage: CertificateUsage, rootCertsChains: [[SecCertificate]], date: Date = Date()) -> (isValid: Bool, validationMessages: [String], rootCert: SecCertificate?, leafCert: SecCertificate?) {
        var messages = [String]()
        for rootChain in rootCertsChains {
            let result = CertificateChainHelper.validateChain(trustAnchor: rootChain, unverifiedChain: secCertChain, date: date)
            
            if (!result.valid) {
                messages.append(contentsOf: result.messages)
                continue
            }
            
            if let leaf = result.leaf,
               let intermediates = result.intermediate {
                let leafValidationResult = _isMdocCertificateValid(secCert: leaf, usage: usage, rootCertsChains: [rootChain + intermediates], date: date)
                
                return (isValid: leafValidationResult.isValid, validationMessages: result.messages + leafValidationResult.validationMessages, rootCert: leafValidationResult.rootCert, leafCert: leaf)
            }
        }
        
        return (isValid: false, validationMessages: messages, rootCert: nil, leafCert: nil)
    }
    
    
    private static func _isMdocCertificateValid(secCert: SecCertificate, usage: CertificateUsage, rootCertsChains: [[SecCertificate]], date: Date = Date()) -> (isValid: Bool, validationMessages: [String], rootCert: SecCertificate?) {
        
        let now = date
        var messages = [String]()
        var trust: SecTrust?
        let policy = SecPolicyCreateBasicX509()
        _ = SecTrustCreateWithCertificates(secCert, policy, &trust)
        
        guard let trust = trust else {
            return (false, ["Not valid certificate for \(usage)"], nil)
        }
        
        let secData: Data = SecCertificateCopyData(secCert) as Data
        
        //print(secData.base64EncodedString())
        
        guard let x509Cert = try? X509.Certificate(derEncoded: [UInt8](secData)) else {
            return (false, ["Not valid certificate for \(usage)"], nil)
        }
        
        guard x509Cert.notValidBefore <= now,
                now <= x509Cert.notValidAfter else {
            return (false, ["Current date not in validity period of Certificate"], nil)
        }
        
        let validityDays = Calendar.current.dateComponents([.day], from: x509Cert.notValidBefore, to: x509Cert.notValidAfter).day
        
        guard let validityDays, validityDays > 0 else {
            return (false, ["Invalid validity period"], nil)
        }
        
        guard !x509Cert.subject.isEmpty,
                let cn = getCommonName(ref: secCert),
                !cn.isEmpty else {
            return (false, ["Missing Common Name of Reader Certificate"], nil)
        }
        
        guard !x509Cert.signature.description.isEmpty else {
            return (false, ["Missing Signature data"], nil)
        }
        
        if x509Cert.serialNumber.description.isEmpty {
            messages.append("Missing Serial number")
        }
        
        if x509Cert.hasDuplicateExtensions() {
            messages.append("Duplicate extensions in Certificate")
        }
        
        if usage == .mdocReaderAuth {
            if !verifyReaderAuthCert(x509Cert, messages: &messages) {
                return (false, messages, nil)
            }
        }
        
        SecTrustSetPolicies(trust, policy)
        SecTrustSetVerifyDate(trust, now as CFDate)
        for certArray in rootCertsChains {
            guard let cert = findCA(certArray) else {
                return (false, ["No root certificate"], nil)
            }
            
            SecTrustSetAnchorCertificates(trust, certArray as CFArray)
            SecTrustSetAnchorCertificatesOnly(trust, true)
            if trustIsValid(trust) {
                
                guard let x509root = try? X509.Certificate(derEncoded: [UInt8](SecCertificateCopyData(cert) as Data)) else {
                    return (false, ["Bad root certificate"], cert)
                }
                
                guard x509root.notValidBefore <= now, now <= x509root.notValidAfter else {
                    return (false, ["Current date not in validity period of Reader Root Certificate"], nil)
                }
                
                if usage == .mdocReaderAuth {
                    if let rootGns = x509root.getSubjectAlternativeNames(),
                       let gns = x509Cert.getSubjectAlternativeNames() {
                        guard gns.elementsEqual(rootGns) else {
                            return (false, ["Issuer data rfc822Name or uniformResourceIdentifier do not match with root cert."], nil)
                        }
                    }
                }
                    
                
                if x509Cert.serialNumber == x509root.serialNumber {
                    continue
                }
                
                let crlSerialNumbers = fetchCRLSerialNumbers(x509root)
                if !crlSerialNumbers.isEmpty {
                    if crlSerialNumbers.contains(x509Cert.serialNumber) {
                        return (false, ["Revoked Certificate for \(cn)"], cert)
                    }
                    if crlSerialNumbers.contains(x509root.serialNumber) {
                        return (false, ["Revoked Root Certificate for \(getCommonName(ref: cert) ?? "")"], cert)
                    }
                }
                return (true, messages, cert)
            }
        }
        
        messages.insert("Certificate not matched with root certificates", at: 0)
        return (false, messages, nil)
    }
    
    private static func findCA(_ chain: [SecCertificate]) -> SecCertificate? {
        return chain.filter {
            certificate in
            guard let x509 = try? X509.Certificate(derEncoded: [UInt8](SecCertificateCopyData(certificate) as Data)) else {
               return false
            }
            
            return isSelfSigned(x509)
            
        } .first
    }
    
    private static func isSelfSigned(_ x509: X509.Certificate) -> Bool {
        
        return x509.subject.elementsEqual(x509.issuer)
    }
    
    
    public static func trustIsValid(_ trust: SecTrust) -> Bool {
        var error: CFError?
        var result = SecTrustEvaluateWithError(trust, &error)
        if let error = error {
            print(error)
        }
        return result
    }
    
     static func fetchCRLSerialNumbers(_ x509root: X509.Certificate) -> [Certificate.SerialNumber] {
        var serialNumbers = [Certificate.SerialNumber]()
        if let ext = x509root.extensions[oid: .X509ExtensionID.cRLDistributionPoints],
           let crlDistribution = try? CRLDistributions(derEncoded: ext.value) {
            for crl in crlDistribution.crls {
                guard let crlUrl = URL(string: crl.distributionPoint),
                      let pem = try? String(contentsOf: crlUrl),
                      let crl = try? CRL(pemEncoded: pem) else { continue }
                serialNumbers.append(contentsOf: crl.revokedSerials.map(\.serial))
            }
        }
        return serialNumbers
    }
    
    static func verifyReaderAuthCert(_ x509: X509.Certificate, messages: inout [String]) -> Bool {
        let rules = [
            IssuerValidationRule(x509),
            AuthorityKeyIdentifierValidationRule(x509),
            SubjectKeyIdentifierValidationRule(x509),
            KeyUsageValidationRule(x509),
            ExtendedKeyUsageValidationRule(x509),
            SignatureAlgorithmValidationRule(x509),
            NotAllowedCriticalExtensionValidationRule(x509),
            SerialNumberValidationRule(x509),
            CRLDistributionPointValidationRule(x509),
            IssuerAlternativeNameValidationRule(x509)
        ]
        
        return rules.reduce(true) {
            value, rule in
            
            let result = rule.validate()
            messages.append(contentsOf: result.1)
            if (!rule.isBlocking) {
                return true
            }
            return value && result.0
        }
    }
    
    public static func getCommonName(ref: SecCertificate) -> String? {
        var cfName: CFString?
        SecCertificateCopyCommonName(ref, &cfName)
        return cfName as String?
    }
}

protocol CertificateValidationRuleProtocol {
    var isBlocking: Bool { get }
    
    init (_ certificate: X509.Certificate)
    
    func validate() -> (Bool, [String])
}

class CertificateValidationRuleBase : CertificateValidationRuleProtocol {
    var isBlocking: Bool {
        return true
    }
    
    internal var x509: X509.Certificate
    
    required init(_ certificate: X509.Certificate) {
        self.x509 = certificate
    }
    
    func validate() -> (Bool, [String]) {
        return (true, [])
    }
    
    
}

class AuthorityKeyIdentifierValidationRule : CertificateValidationRuleBase {
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if let ext_aki = try? x509.extensions.authorityKeyIdentifier {
            if let ext_aki_ki = ext_aki.keyIdentifier,
               ext_aki_ki.isEmpty {
                messages.append("Missing Authority Key Identifier")
                
                return (false, messages)
            }
        }
        else {
            messages.append("Missing Authority Key Identifier")
            return (false, messages)
        }
        
        return (true, messages)
    }
}


class IssuerValidationRule : CertificateValidationRuleBase {
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if x509.issuer.isEmpty {
            messages.append("Missing Issuer")
            return (false, messages)
        }
        
        return (true, messages)
    }
}

class SubjectKeyIdentifierValidationRule : CertificateValidationRuleBase {
    override var isBlocking: Bool {
        return false
    }
    
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        let pkData = Array(x509.publicKey.subjectPublicKeyInfoBytes)
        if let ext_ski = try? x509.extensions.subjectKeyIdentifier {
            let ski = Array(ext_ski.keyIdentifier)
            if ski != Array(Insecure.SHA1.hash(data: pkData)) {
                messages.append("Wrong Subject Key Identifier")
                return (false, messages)
            }
        } else {
            messages.append("Missing Subject Key Identifier")
            return (false, messages)
        }
        
        return (true, messages)
    }
}

class KeyUsageValidationRule : CertificateValidationRuleBase {
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if let keyUsage = try? x509.extensions.keyUsage {
            if !keyUsage.digitalSignature {
                messages.append("Key usage should be verifying Digital Certificate")
                return (false, messages)
            }
       }
        else {
            messages.append("Missing Key usage")
            return (false, messages)
        }
        return (true, messages)
    }
}

class ExtendedKeyUsageValidationRule : CertificateValidationRuleBase {
    
    override var isBlocking: Bool {
        return false
    }
    
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if let extKeyUsage = try? x509.extensions.extendedKeyUsage {
            if !extKeyUsage.contains(ExtendedKeyUsage.Usage(oid: .extKeyUsageMdlReaderAuth)) {
                messages.append("Extended Key usage does not contain mdlReaderAuth")
                return (false, messages)
            }
        }
        else {
            messages.append("Missing Extended Key usage")
            return (false, messages)
        }
        
        return (true, messages)
    }
}

class SignatureAlgorithmValidationRule : CertificateValidationRuleBase {
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if !x509.signatureAlgorithm.isECDSA256or384or512 {
            messages.append("Signature algorithm must be ECDSA with SHA 256/384/512")
            return (false, messages)
        }
        return (true, messages)
    }
}

class NotAllowedCriticalExtensionValidationRule : CertificateValidationRuleBase {
    static let notAllowedExtensions: [String] = NotAllowedExtension.allCases.map(\.rawValue)
    
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        let criticalExtensionOIDs: [String] = x509.extensions.filter(\.critical).map(\.oid).map(\.description)
        let notAllowedCriticalExt = Set(criticalExtensionOIDs).intersection(Set(Self.notAllowedExtensions))
        if !notAllowedCriticalExt.isEmpty {
            messages.append("Not allowed critical extensions \(notAllowedCriticalExt)")
            return (false, messages)
        }
        return (true, messages)
    }
}

class CRLDistributionPointValidationRule : CertificateValidationRuleBase {
    
    let twoDays = TimeInterval(60 * 60 * 24 * 2)
    
    override var isBlocking: Bool {
        return !isShortLived
    }
    
    var isShortLived: Bool {
        return x509.notValidAfter.distance(to: x509.notValidBefore) < twoDays
    }
    
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        if let crlExt1 = x509.extensions[oid: .X509ExtensionID.cRLDistributionPoints] {
            if let crlExt2 = try? CRLDistributionPointsExtension(crlExt1),
               crlExt2.crls.isEmpty {
                messages.append("Missing CRL Distribution extension")
                return (false, messages)
            }
        }
        else {
            messages.append("Missing CRL Distribution extension")
            return (false, messages)
        }
        return (true, messages)
    }
}

class SerialNumberValidationRule : CertificateValidationRuleBase {
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        
        if x509.serialNumber.description.isEmpty {
            messages.append("Missing Serial number")
            return (false, messages)
        }
        
        let serialNumberBits = x509.serialNumber.bytes.count * 8
        
        if (serialNumberBits < 63 || serialNumberBits > 160) {
            return (false, ["Serial number length is invalid"])
        }
        
        return (true, messages)
    }
}

class IssuerAlternativeNameValidationRule : CertificateValidationRuleBase {
    
    override var isBlocking: Bool {
        return false
    }
    
    //issuerAlternativeName must have at least an email or URI/dNSName/IP
    override func validate() -> (Bool, [String]) {
        var messages: [String] = []
        var valid: Bool = true
        if let issuerAlternativeNameExtension = x509.extensions[oid: .X509ExtensionID.issuerAlternativeName] {
            if let issuerAlternativeNameDer = try? DER.parse(issuerAlternativeNameExtension.value) {
                if let issuerAlternativeName = try? GeneralName(derEncoded: issuerAlternativeNameDer) {
                    switch(issuerAlternativeName) {
                    case .rfc822Name(let email):
                        if email.isEmpty {
                            valid = false
                            messages.append("Missing email in Issuer Alternative Name")
                        }
                    case .dnsName(let dns):
                        if dns.isEmpty {
                            valid = false
                            messages.append("Missing dns name in Issuer Alternative Name")
                        }
                    case .ipAddress(let ipAddress):
                        break
                    case .uniformResourceIdentifier(let uri):
                        if uri.isEmpty {
                            valid = false
                            messages.append("Missing URI in Issuer Alternative Name")
                        }
                    default:
                        break
                    }
                }
                else {
                    valid = false
                    messages.append("Missing Issuer Alternative Name")
                }
            }
            else {
                valid = false
                messages.append("Missing Issuer Alternative Name")
            }
        }
        else {
            valid = false
            messages.append("Missing Issuer Alternative Name")
        }
        return (valid, messages)
    }
}
