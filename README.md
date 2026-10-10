# Esquerda vs Direita

Jogo de luta 2D no estilo arcade com sátira política fictícia. Os quatro lutadores são personagens inventados e não representam pessoas reais.

## Baixar no celular

**Android (APK):** abra no celular  
👉 https://github.com/henriquesilva22/esquerda-vs-direita/releases/latest/download/EsquerdaVsDireita.apk  
Depois abra o arquivo baixado e toque em **Instalar**. Se o Android pedir, permita "instalar apps desta fonte".

**Qualquer celular (Android ou iPhone), pelo navegador:**  
👉 https://henriquesilva22.github.io/esquerda-vs-direita/  
- Android (Chrome): menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- iPhone (Safari): botão Compartilhar → **Adicionar à Tela de Início**.

Instalado assim, o jogo abre em tela cheia, na horizontal, e funciona sem internet.

## Como os arquivos são gerados

A cada envio para a branch `main`, o GitHub Actions faz duas coisas sozinho:

| Workflow | O que faz | Onde aparece |
|---|---|---|
| `APK Android` (`.github/workflows/android-apk.yml`) | Monta o projeto Android com Capacitor e compila o APK | Aba **Releases** |
| `Site (GitHub Pages)` (`.github/workflows/site.yml`) | Publica a versão web instalável | `henriquesilva22.github.io/esquerda-vs-direita` |

O APK é um **build de teste**, assinado com a chave de depuração em `android-config/` (sempre a mesma, para você poder atualizar o app sem desinstalar). Para publicar na Google Play ou na App Store, siga `PUBLICAR.md`.

## Estrutura

```
src/                    o jogo (HTML + JavaScript + fontes)
web/                    manifesto, ícones e service worker da versão instalável
assets/                 ícone e splash de origem do app
loja/                   prints, textos e política de privacidade para as lojas
scripts/build-www.mjs   monta o jogo para o app (www/) ou para o site (--web site)
scripts/configure-native.mjs  trava na horizontal e esconde a barra de status (iOS/Android)
.github/workflows/      builds automáticos (APK e site)
```

## Rodar no computador

```bash
node scripts/build-www.mjs --web site
npx http-server site -p 8080
```

Abra http://localhost:8080. Controles: A/D andar, Espaço pular, Shift defender, J soco, K chute, 1–4 habilidades, Esc pausar.
