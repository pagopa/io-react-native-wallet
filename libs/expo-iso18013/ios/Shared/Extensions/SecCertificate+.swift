//
//  SecCertificate+.swift
//  libIso18013
//
//  Created by Antonio on 04/10/24.
//

import Foundation

extension SecCertificate {
  public func getPublicKey() -> Data? {
    guard let certificatePublicKey = SecCertificateCopyKey(self) else {
      return nil
    }
    
    var error: Unmanaged<CFError>?
    
    guard let certificatePublicKeyData = SecKeyCopyExternalRepresentation(certificatePublicKey, &error) else {
      return nil
    }
    
    return certificatePublicKeyData as Data
  }
}
