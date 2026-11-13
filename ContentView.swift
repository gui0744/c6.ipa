import SwiftUI
import LocalAuthentication
import PhotosUI

struct ContentView: View {
    @State private var name = "Guilherme"
    @State private var balance = "500,00"
    @State private var showBalance = true
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var profileImage: UIImage?
    @State private var authenticated = false
    @State private var key = ""
    @State private var showKeyPrompt = false
    @State private var investmentUnlocked = false
    @State private var status = ""
    @State private var selectedTab = 0

    private let yellow = Color(red: 1.0, green: 0.82, blue: 0.12)

    var body: some View {
        ZStack {
            Color(red: 0.055, green: 0.06, blue: 0.07).ignoresSafeArea()
            if !authenticated {
                authenticationView
            } else {
                dashboard
            }
        }
        .tint(yellow)
        .onChange(of: selectedPhoto) { item in
            Task {
                if let data = try? await item?.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) { profileImage = image }
            }
        }
        .alert("Acesso ao Investir", isPresented: $showKeyPrompt) {
            TextField("Digite sua KEY", text: $key)
                .textInputAutocapitalization(.characters)
            Button("Validar") { Task { await validateKey() } }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("A KEY libera somente a área demonstrativa de investimentos.")
        }
        .alert("3105 Yellow", isPresented: Binding(
            get: { !status.isEmpty },
            set: { if !$0 { status = "" } }
        )) {
            Button("OK") { status = "" }
        } message: { Text(status) }
    }

    private var authenticationView: some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: "sun.max.fill").font(.system(size: 58)).foregroundStyle(yellow)
            Text("YELLOW").font(.system(size: 32, weight: .bold, design: .rounded))
            Text("Carteira demonstrativa").foregroundStyle(.secondary)
            Button(action: authenticate) {
                Label("Entrar com Face ID / código", systemImage: "faceid")
                    .font(.headline).foregroundStyle(.black)
                    .frame(maxWidth: .infinity).padding()
                    .background(yellow).clipShape(RoundedRectangle(cornerRadius: 18))
            }
            Text("A autenticação é feita pelo iOS. Nenhuma biometria é coletada pelo app.")
                .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
            Spacer()
            Text("DEMO — NÃO É UM BANCO").font(.caption2).foregroundStyle(.secondary)
        }.padding(28)
    }

    private var dashboard: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Olá,").foregroundStyle(.secondary)
                            Text(name).font(.largeTitle.weight(.semibold))
                        }
                        Spacer()
                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            if let profileImage {
                                Image(uiImage: profileImage).resizable().scaledToFill()
                                    .frame(width: 54, height: 54).clipShape(Circle())
                            } else {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.system(size: 52)).foregroundStyle(yellow)
                            }
                        }
                    }
                    .padding(.top, 16)

                    VStack(alignment: .leading, spacing: 18) {
                        HStack {
                            Image(systemName: "flag.fill").foregroundStyle(yellow)
                            Text("Conta demonstrativa").foregroundStyle(.secondary)
                        }
                        Text("Saldo em reais").foregroundStyle(.secondary)
                        HStack {
                            Text(showBalance ? "R$ \(balance)" : "R$ •••••")
                                .font(.system(size: 30, weight: .medium))
                            Spacer()
                            Button { showBalance.toggle() } label: {
                                Image(systemName: showBalance ? "eye.slash" : "eye")
                                    .foregroundStyle(.white)
                            }
                        }
                        HStack {
                            TextField("500,00", text: $balance)
                                .keyboardType(.decimalPad)
                                .textFieldStyle(.roundedBorder)
                            Text("Saldo fictício editável").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    .padding(20).background(Color(white: 0.13))
                    .clipShape(RoundedRectangle(cornerRadius: 24))

                    HStack(spacing: 12) {
                        quickTile("Transferir", "arrow.left.arrow.right")
                        quickTile("Cartões", "creditcard")
                        quickTile("Extrato", "doc.text")
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        Text("Pix").font(.title3.weight(.semibold))
                        HStack {
                            Image(systemName: "qrcode")
                            Text("Área ilustrativa — operações desativadas")
                                .font(.subheadline)
                        }.foregroundStyle(.secondary)
                        HStack {
                            actionLabel("Enviar", "paperplane")
                            Spacer()
                            actionLabel("Pagar", "barcode")
                            Spacer()
                            actionLabel("Cobrar", "qrcode")
                        }.padding().background(Color(white: 0.18))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .padding(18).background(Color(white: 0.11))
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    Text("Aplicativo fictício para demonstração. Não representa saldo ou serviços bancários reais.")
                        .font(.footnote).foregroundStyle(.secondary)
                        .padding(.bottom, 18)
                }.padding(.horizontal, 18)
            }
            HStack {
                tabButton("Início", "house.fill", 0)
                tabButton("Cartões", "creditcard", 1)
                Button {
                    if investmentUnlocked { selectedTab = 2 }
                    else { showKeyPrompt = true }
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                        Text("Investir").font(.caption)
                    }.foregroundStyle(yellow).frame(maxWidth: .infinity)
                }
                tabButton("Extrato", "doc.text", 3)
            }
            .padding(.top, 12).padding(.bottom, 8)
            .background(Color(white: 0.10))
        }
        .sheet(isPresented: Binding(get: { selectedTab == 2 && investmentUnlocked },
                                    set: { if !$0 { selectedTab = 0 } })) {
            InvestmentDemoView().preferredColorScheme(.dark)
        }
    }

    private func quickTile(_ title: String, _ icon: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon).font(.title2)
            Text(title).font(.subheadline)
        }.frame(maxWidth: .infinity).padding(.vertical, 22)
            .background(Color(white: 0.14)).clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private func actionLabel(_ title: String, _ icon: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
            Text(title).font(.caption)
        }.foregroundStyle(.white)
    }

    private func tabButton(_ title: String, _ icon: String, _ index: Int) -> some View {
        Button { selectedTab = index } label: {
            VStack(spacing: 5) {
                Image(systemName: icon)
                Text(title).font(.caption)
            }.foregroundStyle(selectedTab == index ? yellow : .gray)
                .frame(maxWidth: .infinity)
        }
    }

    private func authenticate() {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            status = "Este aparelho não disponibilizou autenticação local."
            return
        }
        context.evaluatePolicy(.deviceOwnerAuthentication,
                               localizedReason: "Desbloquear a demonstração Yellow") { success, _ in
            DispatchQueue.main.async {
                if success { authenticated = true }
                else { status = "Autenticação não concluída." }
            }
        }
    }

    private func validateKey() async {
        do {
            let valid = try await KeyService.shared.validate(key.trimmingCharacters(in: .whitespacesAndNewlines))
            await MainActor.run {
                if valid { investmentUnlocked = true; selectedTab = 2 }
                else { status = "KEY inválida, expirada ou revogada." }
            }
        } catch {
            await MainActor.run { status = error.localizedDescription }
        }
    }
}

struct InvestmentDemoView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 48)).foregroundStyle(.yellow)
                Text("Investimentos — demonstração").font(.title2.bold())
                Text("Painel ilustrativo. Não há aplicações, recomendações ou movimentação de dinheiro.")
                    .multilineTextAlignment(.center).foregroundStyle(.secondary)
                Spacer()
            }.padding().background(Color(white: 0.06))
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Fechar") { dismiss() } } }
        }
    }
}
