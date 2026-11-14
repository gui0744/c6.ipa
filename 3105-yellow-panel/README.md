# 3105 Yellow Panel — DEB scaffold

Pacote Debian para Sileo contendo a interface web local, preferencias e exemplo de integracao UIKit. Tema preto/amarelo; controles persistiveis em `preferences.json`.

## Escopo seguro desta versao

- Instala apenas arquivos de interface/configuracao em `/usr/share/3105-yellow-panel/`.
- Nao injeta codigo em jogos, nao le memoria de outros processos e nao usa offsets, Silent Aim, alteracao de projeteis ou bypass.
- Os controles ESP/Aim desta entrega sao preferencias/UI demonstrativas. A ligacao a dados reais deve usar API/documentacao de um jogo proprio ou integracao explicitamente autorizada.
- O gesto de quatro dedos esta demonstrado em `UIKit/FourFingerPanelHost.swift`; e necessario integra-lo a um app host autorizado para apresentar a janela. O pacote nao instala um tweak global nem intercepta gestos do sistema.

## Construir o .deb

Em macOS/Linux com ferramentas Debian:

```sh
dpkg-deb --root-owner-group --build 3105-yellow-panel 3105-yellow-panel_0.1.0_iphoneos-arm64.deb
```

Instale o arquivo pelo Sileo apenas em dispositivo de teste compativel. Esta e uma base de assets/configuracao, nao um tweak compilado/autossuficiente.
