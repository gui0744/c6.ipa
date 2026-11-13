import SwiftUI

struct PatchCatalogView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedCategory: PatchCategory?
    @State private var search = ""
    @State private var selectedItem: PatchItem?

    private let categories = PatchCategory.samples

    var body: some View {
        NavigationStack {
            List {
                if let selectedCategory {
                    Section {
                        ForEach(selectedCategory.items.filter {
                            search.isEmpty || $0.name.localizedCaseInsensitiveContains(search)
                        }) { item in
                            Button { self.selectedItem = item } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: item.symbol).foregroundStyle(.yellow).frame(width: 28)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(item.name).foregroundStyle(.primary)
                                        Text(item.fileType + " • catálogo").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
                                }.padding(.vertical, 4)
                            }
                        }
                    } header: {
                        Text(selectedCategory.title)
                    }
                } else {
                    Section("Categorias do 3105") {
                        ForEach(categories) { category in
                            Button { selectedCategory = category } label: {
                                HStack(spacing: 14) {
                                    Image(systemName: category.symbol)
                                        .font(.title3).foregroundStyle(.black)
                                        .frame(width: 42, height: 42)
                                        .background(.yellow, in: RoundedRectangle(cornerRadius: 12))
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(category.title).font(.headline).foregroundStyle(.primary)
                                        Text(category.subtitle).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text("\(category.items.count)").font(.caption.bold()).foregroundStyle(.secondary)
                                    Image(systemName: "chevron.right").font(.caption).foregroundStyle(.secondary)
                                }.padding(.vertical, 5)
                            }
                        }
                    }
                    Section {
                        Text("Catálogo demonstrativo. Os pacotes do repositório original não são instalados nem aplicados automaticamente. Adicione arquivos próprios ou autorizados pelo painel para habilitar downloads e ações compatíveis.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .searchable(text: $search, prompt: "Buscar nesta categoria")
            .navigationTitle(selectedCategory?.title ?? "Patches 3105")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if selectedCategory != nil {
                        Button("Categorias") { selectedCategory = nil; search = "" }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) { Button("Fechar") { dismiss() } }
            }
            .sheet(item: $selectedItem) { item in
                PatchItemDetailView(item: item)
                    .presentationDetents([.medium])
                    .preferredColorScheme(.dark)
            }
        }
        .preferredColorScheme(.dark)
    }
}

private struct PatchCategory: Identifiable {
    let id: String
    let title: String
    let subtitle: String
    let symbol: String
    let items: [PatchItem]

    static let samples: [PatchCategory] = [
        .init(id: "normal", title: "FF NORMAL", subtitle: "Área de pacotes cadastrados", symbol: "gamecontroller", items: [
            .init(name: "Pacotes FF Normal", fileType: "Arquivo cadastrado pelo painel", symbol: "square.stack.3d.up")
        ]),
        .init(id: "max", title: "FF MAX", subtitle: "Área de pacotes cadastrados", symbol: "gamecontroller.fill", items: [
            .init(name: "Pacotes FF Max", fileType: "Arquivo cadastrado pelo painel", symbol: "square.stack.3d.up")
        ]),
        .init(id: "texture", title: "TEXTURA", subtitle: "Biblioteca de texturas", symbol: "circle.lefthalf.filled", items: [
            .init(name: "Texturas", fileType: "Arquivo compatível", symbol: "photo")
        ]),
        .init(id: "themes", title: "TEMAS / PERSONALIZAÇÃO", subtitle: "Estrutura inspirada nos pacotes .3105", symbol: "paintpalette", items: [
            .init(name: "Temas de interface", fileType: ".3105 / .3105pass", symbol: "paintbrush"),
            .init(name: "Temas de tela", fileType: ".tendies", symbol: "rectangle.inset.filled")
        ]),
        .init(id: "wallpapers", title: "WALLPAPERS / FUNDOS", subtitle: "Personalização visual do 3105", symbol: "photo.on.rectangle", items: [
            .init(name: "Fundo do aplicativo", fileType: "Imagem", symbol: "photo")
        ]),
        .init(id: "files", title: "ARQUIVOS", subtitle: "Downloads disponibilizados pelo painel", symbol: "folder", items: [
            .init(name: "Meus arquivos", fileType: "Downloads", symbol: "doc")
        ]),
        .init(id: "keys", title: "KEYS", subtitle: "Informações de acesso", symbol: "key.fill", items: [
            .init(name: "Status da sessão", fileType: "Acesso", symbol: "lock.shield")
        ])
    ]
}

private struct PatchItem: Identifiable {
    let id = UUID()
    let name: String
    let fileType: String
    let symbol: String
}

private struct PatchItemDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let item: PatchItem
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: item.symbol).font(.system(size: 42)).foregroundStyle(.yellow)
                Text(item.name).font(.title2.bold())
                Text(item.fileType).foregroundStyle(.secondary)
                Text("Nenhum arquivo foi publicado para este item. O administrador poderá cadastrar o arquivo e o link no painel do 3105.")
                    .multilineTextAlignment(.center).font(.footnote).foregroundStyle(.secondary)
                Spacer()
            }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(white: 0.06))
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Fechar") { dismiss() } } }
        }
    }
}
