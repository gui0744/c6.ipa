import Foundation

struct KeyValidationResponse: Decodable {
    let valid: Bool
    let message: String?
}

enum KeyServiceError: Error, LocalizedError {
    case notConfigured, badResponse
    var errorDescription: String? {
        switch self {
        case .notConfigured: return "O serviço de KEY ainda não foi configurado."
        case .badResponse: return "Não foi possível validar a KEY."
        }
    }
}

final class KeyService {
    static let shared = KeyService()
    func validate(_ key: String) async throws -> Bool {
        guard !AppConfig.keyServiceBaseURL.isEmpty,
              let url = URL(string: AppConfig.keyServiceBaseURL + "/validate") else {
            throw KeyServiceError.notConfigured
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["key": key])
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let result = try? JSONDecoder().decode(KeyValidationResponse.self, from: data) else {
            throw KeyServiceError.badResponse
        }
        return result.valid
    }
}
