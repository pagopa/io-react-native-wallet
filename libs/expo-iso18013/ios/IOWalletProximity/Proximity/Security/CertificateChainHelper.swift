//
//  CertificateChainHelper.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 18/07/25.
//
import Foundation
internal import X509
internal import SwiftASN1


class CertificateChainHelper {
    
    static func validateChain(trustAnchor: [SecCertificate], unverifiedChain: [SecCertificate], date: Date) -> (valid: Bool, leaf: SecCertificate?, intermediate: [SecCertificate]?, messages: [String]) {
        
        let trustAnchorLocal = trustAnchor.compactMap({try? Certificate($0)})
        let unverifiedChainLocal = unverifiedChain.compactMap({try? Certificate($0)})
        
        let asyncResult = UnsafeTask {
            return await CertificateChainHelper().validateChain(trustAnchor: trustAnchorLocal, unverifiedChain: unverifiedChainLocal, date: date)
        }.get()
        
        var result: (valid: Bool, leaf: SecCertificate?, intermediate: [SecCertificate]?, messages: [String]) = (valid: false, nil, nil, [])
        
        if (asyncResult.valid) {
            if let leaf = asyncResult.leaf,
               let leafSec = try? SecCertificate.makeWithCertificate(leaf),
               let intermediates = asyncResult.intermediate
            {
                let intermediatesSec = intermediates.compactMap({try? SecCertificate.makeWithCertificate($0)})
                
                result = (valid: true, leaf: leafSec, intermediate: intermediatesSec, asyncResult.messages)
            }
        }
        else {
            result = (valid: false, nil, nil, asyncResult.messages)
        }
        
        return result
        
    }
    
    private func findNextValid(notTrustedCerts: [Certificate], trustedCerts: [Certificate], root: CertificateStore, date: Date) async -> Certificate? {
        var verifier = Verifier(rootCertificates: root) { RFC5280Policy(validationTime: date) }
        
        for notTrustedCert in notTrustedCerts {
            let result = await verifier.validate(
                leafCertificate: notTrustedCert,
                intermediates: CertificateStore(trustedCerts),
                diagnosticCallback: {
                    e in
                    //print(e)
                }
            )
            
            if case .validCertificate( _) = result {
                return notTrustedCert
            }
        }
        
        return nil
        
    }
    
    private func findLastOfChain(unverifiedCerts: [Certificate], trustCerts: [Certificate], date: Date) async -> (
        leaf: Certificate?, intermediate: [Certificate]?, unknown: [Certificate]?) {
            
            var removed = unverifiedCerts.filter({
                cert in
                return trustCerts.contains(where: {$0 == cert})
            })
            
            var notTrusted = unverifiedCerts.filter({
                cert in
                return !trustCerts.contains(where: {$0 == cert})
            })
            
            let rootStore = CertificateStore(trustCerts)
            
            var trusted: [Certificate] = []
            
            while(true) {
                if let trustedCert = await findNextValid(notTrustedCerts: notTrusted, trustedCerts: trusted, root: rootStore, date: date) {
                    trusted.append(trustedCert)
                    notTrusted.removeAll(where: {$0 == trustedCert})
                }
                else {
                    break
                }
            }
            if (notTrusted.isEmpty && trusted.isEmpty) {
                trusted = removed
            }
            
            let intermediates = trusted.isEmpty ? [] : trusted[0..<trusted.count - 1]
            
            return (leaf: trusted.last, intermediate: intermediates.map({$0}), unknown: notTrusted)
            
            
        }
    
    
    
    
    
    private func validateChain(trustAnchor: [SecCertificate], unverifiedChain: [SecCertificate], date: Date) async -> (valid: Bool, leaf: Certificate?, intermediate: [Certificate]?, messages: [String]) {
        return await validateChain(trustAnchor: trustAnchor.compactMap({try? Certificate($0)}), unverifiedChain: unverifiedChain.compactMap({try? Certificate($0)}), date: date)
    }
    
    
    private func validateChain(trustAnchor: [Certificate], unverifiedChain: [Certificate], date: Date) async -> (valid: Bool, leaf: Certificate?, intermediate: [Certificate]?, messages: [String]) {
        let (leaf, intermediates, unknown) = await findLastOfChain(unverifiedCerts: unverifiedChain, trustCerts: trustAnchor, date: date)
        
        guard let leaf = leaf else {
            return (valid: false, nil, nil, ["No valid leaf found"])
        }
        
        guard let intermediates = intermediates else {
            return (valid: false, nil, nil, ["No valid leaf found"])
        }
        
        if (!(unknown?.isEmpty ?? true)) {
            return (valid: false, nil, nil, ["Unknown certificate in chain"])
        }
        
        let rootStore = CertificateStore(trustAnchor)
        
        var verifier = Verifier(rootCertificates: rootStore) { RFC5280Policy(validationTime: date) }
        
        
        let result = await verifier.validate(
            leafCertificate: leaf,
            intermediates: CertificateStore(intermediates),
            diagnosticCallback: {
                e in
                //print(e)
            }
        )
        
        if case .validCertificate( _) = result {
            return (valid: true, leaf, intermediates, [])
        }
        else {
            return (valid: false, nil, nil, ["\(result)"])
        }
    }
    
    class UnsafeTask<T: Sendable> : @unchecked Sendable {
        let dispatchGroup = DispatchGroup()
        private var result: T?
        private var block: (@Sendable () async -> T)?
        init(block:  (@Sendable () async -> T)?) {
            dispatchGroup.enter()
            self.block = block
            let this = self
            
            Task {
                this.result = await this.block?()
                this.dispatchGroup.leave()
            }
        }
        
        func get() -> T {
            if let result = result { return result }
            dispatchGroup.wait()
            return result!
        }
    }
}
